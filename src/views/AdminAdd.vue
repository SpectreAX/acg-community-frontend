<template>
  <div class="admin-background">
    
    <div class="admin-container">
      <div class="header">
        <h2>{{ isEditMode ? '编辑番剧' : '发布新番' }}</h2>
        
        <div class="header-actions">
          <el-button type="primary" @click="submitForm">
            {{ isEditMode ? '保存修改' : '立即发布' }}
          </el-button>
          <el-button type="warning" @click="batchDialogVisible = true" v-if="!isEditMode">批量导入</el-button>
          <el-button @click="$router.go(-1)">返回</el-button>
        </div>
      </div>

      <el-card class="form-card">
        <el-form :model="form" label-width="100px" label-position="top">
          
          <div class="section-block">
            <h3 class="block-title">基础信息</h3>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="Bangumi ID (一键填充)">
                  <el-input v-model="form.bgmId" placeholder="输入 ID (如 329906)">
                    <template #append>
                      <el-button type="primary" :loading="loading" @click="fetchByBgmId">
                        一键填充数据
                      </el-button>
                    </template>
                  </el-input>
                  <div class="tips">输入 ID 后点击按钮，自动从 Bangumi 拉取数据。</div>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="番剧标题">
                  <el-input v-model="form.title" placeholder="自动填充或手动输入" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="封面图片">
                  <div class="cover-upload-container">
                    <el-upload
                      class="cover-uploader"
                      action="/api/file/upload"
                      :show-file-list="false"
                      :on-success="handleCoverSuccess"
                    >
                      <img v-if="form.coverUrl" :src="form.coverUrl" class="cover-img" referrerpolicy="no-referrer" />
                      <el-icon v-else class="uploader-icon"><Plus /></el-icon>
                    </el-upload>
                    
                    <div class="url-input">
                      <el-input v-model="form.coverUrl" placeholder="支持本地上传或粘贴网络链接" clearable />
                      <div class="tips">点击左侧方框上传本地图片，或者直接粘贴网络链接。</div>
                    </div>
                  </div>
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="总集数">
                  <el-input-number v-model="form.totalEpisodes" :min="0" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="评分">
                  <el-input-number v-model="form.rating" :precision="1" :step="0.1" :max="10" style="width:100%" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="剧情简介">
              <el-input v-model="form.summary" type="textarea" :rows="4" />
            </el-form-item>
            
            <el-form-item label="标签 (Tags)">
              <el-input v-model="form.tags" placeholder="逗号分隔，例如：热血,战斗" />
            </el-form-item>

            <el-form-item label="放送平台">
              <el-select v-model="form.platform" placeholder="请选择">
                <el-option label="TV动画" value="TV动画" />
                <el-option label="剧场版" value="剧场版" />
                <el-option label="WEB动画" value="WEB动画" />
                <el-option label="OVA" value="OVA" />
              </el-select>
            </el-form-item>
          </div>
          <div class="section-block">
          <h3 class="block-title">详细信息 (InfoBox)</h3>
          
          <div v-for="(item, index) in infoList" :key="'info'+index" class="dynamic-row">
            <el-input v-model="item.key" placeholder="项目 (如: 导演)" style="width: 150px;" />
            <span class="colon">:</span>
            <el-input v-model="item.value" placeholder="内容" style="flex: 1;" />
            <el-button type="danger" circle :icon="Delete" size="small" @click="infoList.splice(index, 1)" />
          </div>
          
          <div style="margin-top: 10px;">
            <el-button type="primary" link :icon="Plus" @click="infoList.push({key:'', value:''})">
              添加一行
            </el-button>
          </div>
        </div>

          <div class="section-block">
            <h3 class="block-title">角色 & 声优 ({{ charList.length }})</h3>
            <div class="grid-list">
              <div v-for="(item, index) in charList" :key="'char'+index" class="grid-item">
                <div class="grid-img-box">
                  <img :src="item.image || 'https://bgm.tv/img/no_icon_subject.png'" referrerpolicy="no-referrer">
                  <el-input v-model="item.image" size="small" placeholder="图片URL" class="img-input" />
                </div>
                <div class="grid-inputs">
                  <el-input v-model="item.name" size="small" placeholder="角色名" />
                  <el-input v-model="item.role" size="small" placeholder="类型" />
                  <el-input v-model="item.cv" size="small" placeholder="CV" />
                </div>
                <el-button class="del-btn" type="danger" :icon="Delete" circle size="small" @click="charList.splice(index, 1)" />
              </div>
              <div class="add-card" @click="charList.push({name:'', role:'主角', cv:'', image:''})">
                <el-icon><Plus /></el-icon> <span>添加角色</span>
              </div>
            </div>
          </div>

          <div class="section-block">
            <h3 class="block-title">制作阵容 ({{ staffList.length }})</h3>
            <div class="dynamic-row" v-for="(item, index) in staffList" :key="'staff'+index">
              <el-input v-model="item.role" placeholder="职位 (如: 导演)" style="width: 140px;" />
              <span class="colon">-</span>
              <el-input v-model="item.name" placeholder="名字" style="flex: 1;" />
              <el-button type="danger" circle :icon="Delete" size="small" @click="staffList.splice(index, 1)" />
            </div>
            <div style="margin-bottom: 20px;">
              <el-button type="primary" link :icon="Plus" @click="staffList.push({name:'', role:''})">添加制作人员</el-button>
            </div>
          </div>

          <div class="section-block">
            <h3 class="block-title">章节列表 ({{ epList.length }})</h3>
            <div class="dynamic-row" v-for="(item, index) in epList" :key="'ep'+index">
              <el-input-number v-model="item.sort" :min="0" style="width: 80px;" controls-position="right" />
              <el-input v-model="item.name" placeholder="标题 (如: 第一话)" style="flex: 1; margin-left: 10px;" />
              <el-input v-model="item.videoId" placeholder="VideoID" style="width: 150px; margin-left: 10px;" />
              <el-input v-model="item.desc" placeholder="简介 (选填)" style="flex: 2; margin-left: 10px;" />
              <el-button type="danger" circle :icon="Delete" size="small" @click="epList.splice(index, 1)" style="margin-left: 10px;" />
            </div>
            <div style="margin-bottom: 20px;">
              <el-button type="primary" link :icon="Plus" @click="epList.push({sort: epList.length+1, name:'', desc:''})">添加章节</el-button>
              <el-button type="success" link @click="openBatchVideoDialog">批量填入 VideoID</el-button>
            </div>
          </div>

          <div class="footer-bar">
            <el-button type="primary" size="large" @click="submitForm" style="width: 200px;">
              {{ isEditMode ? '保存修改' : '立即发布' }}
            </el-button>
          </div>

        </el-form>
      </el-card>
    </div>


    <!-- 批量导入弹窗 -->
    <el-dialog v-model="batchDialogVisible" title="批量导入番剧" width="500px">
      <div>
        <el-input 
          v-if="!batchSuccessList.length"
          v-model="batchInput" 
          type="textarea" 
          :rows="10" 
          placeholder="请输入 Bangumi ID，可以用换行、逗号或空格分隔
例如：
329906
364450" 
        />
        
        <div v-else class="batch-success-box">
             <div class="success-title">成功导入列表</div>
             <div v-for="item in batchSuccessList" :key="item.id" class="success-item">
                <router-link :to="'/subject/'+item.id" target="_blank">{{ item.title }}</router-link>
             </div>
        </div>

        <div class="progress-log" v-if="batchProgress">
           <pre>{{ batchProgress }}</pre>
        </div>
      </div>
      <template #footer>
        <el-button @click="batchDialogVisible = false" :disabled="batchLoading">取消</el-button>
        <el-button type="primary" @click="startBatchImport" :loading="batchLoading">开始导入</el-button>
      </template>
    </el-dialog>

    <!-- 批量 VideoID 弹窗 -->
    <el-dialog
      v-model="batchVideoDialogVisible"
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
          v-model="batchVideoInput"
          type="textarea"
          :rows="10"
          placeholder="在此粘贴 VideoID 列表...&#10;e0555...&#10;a1234...&#10;..."
        ></el-input>

        <div class="preview-section" v-if="previewVideoList.length > 0">
          <div style="margin: 10px 0; font-weight: bold;">预览匹配结果 (前 5 条):</div>
          <el-table :data="previewVideoList.slice(0, 5)" size="small" border>
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
          <div v-if="previewVideoList.length > 5" style="text-align: center; color: #999; font-size: 12px; margin-top: 5px;">
            ...共 {{ previewVideoList.length }} 条匹配...
          </div>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="batchVideoDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="applyBatchVideoImport" :disabled="previewVideoList.length === 0">
            确认填充
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { useAdminAddLogic } from './js/AdminAddLogic.js'
import { Delete, Plus } from '@element-plus/icons-vue'

const {
  router, route, loading, isEditMode, form,
  infoList, charList, staffList, epList,
  handleCoverSuccess, fetchByBgmId, loadData, submitForm,
  batchDialogVisible, batchInput, batchProgress, batchLoading, startBatchImport, batchSuccessList,
  batchVideoDialogVisible, batchVideoInput, previewVideoList, openBatchVideoDialog, applyBatchVideoImport
} = useAdminAddLogic()
</script>

<style scoped>
@import './css/AdminAdd.css';
</style>