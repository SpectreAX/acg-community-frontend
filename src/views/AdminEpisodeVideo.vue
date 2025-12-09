<template>
  <div class="admin-video-container">
    <div class="header">
      <h2>{{ subjectTitle }} - 视频源管理</h2>
      <div class="header-actions">
        <el-button type="success" plain @click="openBatchDialog">批量导入 ID</el-button>
        <el-button type="primary" @click="saveChanges" :loading="saving">保存修改</el-button>
        <el-button @click="$router.push('/admin/manage')">返回列表</el-button>
      </div>
    </div>

    <el-card class="video-list-card" v-loading="loading">
      <div v-if="episodes.length === 0" class="empty-tip">
        暂无章节信息，请先在编辑页面添加章节。
      </div>
      
      <el-table :data="episodes" style="width: 100%" v-else>
        <el-table-column prop="sort" label="话数" width="80" align="center" />
        <el-table-column prop="name" label="标题" min-width="200">
          <template #default="scope">
            <span>{{ scope.row.name }}</span>
            <span v-if="scope.row.name_cn" style="color: #999; margin-left: 8px; font-size: 12px;">
              ({{ scope.row.name_cn }})
            </span>
          </template>
        </el-table-column>
        <el-table-column label="阿里云 VOD ID" min-width="350">
          <template #default="scope">
            <el-input 
              v-model="scope.row.videoId" 
              placeholder="请输入 32位 VideoID (如 e0555...)" 
              clearable 
            />
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="scope">
            <el-tag type="success" v-if="scope.row.videoId">已配置</el-tag>
            <el-tag type="info" v-else>未配置</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 批量导入对话框 -->
    <el-dialog
      v-model="batchDialogVisible"
      title="批量导入 VideoID"
      width="600px"
      append-to-body
    >
      <div class="batch-content">
        <el-alert
          title="说明"
          type="info"
          :closable="false"
          show-icon
          style="margin-bottom: 15px;"
        >
          <template #default>
            每行一个 ID，系统将按照<b>话数顺序</b>自动填充到章节列表中。<br>
            空行将被跳过。如果行数超过章节数，多余的 ID 将被忽略。
          </template>
        </el-alert>
        
        <el-input
          v-model="batchInput"
          type="textarea"
          :rows="10"
          placeholder="在此粘贴 VideoID 列表...&#10;e0555...&#10;a1234...&#10;..."
        ></el-input>

        <div class="preview-section" v-if="previewList.length > 0">
          <div style="margin: 10px 0; font-weight: bold;">预览匹配结果 (前 5 条):</div>
          <el-table :data="previewList.slice(0, 5)" size="small" border>
            <el-table-column prop="sort" label="话数" width="60" align="center"></el-table-column>
            <el-table-column prop="oldId" label="原 ID" show-overflow-tooltip>
                <template #default="{row}">
                    <span style="color: #999" v-if="!row.oldId">无</span>
                    <span v-else>{{ row.oldId }}</span>
                </template>
            </el-table-column>
            <el-table-column prop="newId" label="新 ID" show-overflow-tooltip>
                <template #default="{row}">
                    <span style="color: var(--el-color-success)">{{ row.newId }}</span>
                </template>
            </el-table-column>
          </el-table>
          <div v-if="previewList.length > 5" style="text-align: center; color: #999; font-size: 12px; margin-top: 5px;">
            ...共 {{ previewList.length }} 条匹配...
          </div>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="batchDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="applyBatchImport" :disabled="previewList.length === 0">
            确认填充
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const subjectId = route.params.id

const subjectTitle = ref('')
const episodes = ref([])
const loading = ref(false)
const saving = ref(false)

// 批量导入相关
const batchDialogVisible = ref(false)
const batchInput = ref('')

const openBatchDialog = () => {
    batchInput.value = ''
    batchDialogVisible.value = true
}

// 实时计算预览结果
const previewList = computed(() => {
    if (!batchInput.value) return []
    
    // 1. 提取非空行
    const lines = batchInput.value
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
    
    // 2. 匹配
    const result = []
    episodes.value.forEach((ep, index) => {
        if (index < lines.length) {
            result.push({
                sort: ep.sort,
                name: ep.name,
                oldId: ep.videoId,
                newId: lines[index]
            })
        }
    })
    return result
})

const applyBatchImport = () => {
    // 应用更改
    previewList.value.forEach((item, index) => {
        // 直接按顺序找到对应的 episode
        // 注意：这里假定 episodes 已经按 sort 排序好了 (loadData 中已排序)
        if (episodes.value[index]) {
            episodes.value[index].videoId = item.newId
        }
    })
    
    ElMessage.success(`成功填充 ${previewList.value.length} 个 VideoID`)
    batchDialogVisible.value = false
}

const loadData = async () => {
  loading.value = true
  try {
    const res = await axios.get(`/api/anime/${subjectId}`)
    if (res.data.code === '200') {
      const data = res.data.data
      subjectTitle.value = data.title
      
      let epList = []
      if (data.episodesJson) {
        try {
          epList = JSON.parse(data.episodesJson)
        } catch(e) { console.error(e) }
      }
      
      // 确保每个 item 都有 videoId 字段 (如果没有则为空字符串)
      episodes.value = epList.map(ep => ({
        ...ep,
        videoId: ep.videoId || ''
      })).sort((a, b) => a.sort - b.sort)
    } else {
      ElMessage.error(res.data.msg)
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

const saveChanges = async () => {
  saving.value = true
  try {
    // 构造 DTO
    // DTO: { animeId: Long, episodes: [ {id, videoId} ] }
    const payload = {
      animeId: subjectId,
      episodes: episodes.value.map(ep => ({
        id: ep.id,
        videoId: ep.videoId
      }))
    }

    const res = await axios.post('/api/anime/update-video-ids', payload)
    if (res.data.code === '200') {
      ElMessage.success('保存成功')
      // 重新加载以确认
      loadData()
    } else {
      ElMessage.error(res.data.msg || '保存失败')
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('网络错误或服务器异常')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  if (subjectId) {
    loadData()
  } else {
    ElMessage.error('缺少参数')
    router.go(-1)
  }
})
</script>

<style scoped>
.admin-video-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.video-list-card {
  min-height: 400px;
}
</style>
