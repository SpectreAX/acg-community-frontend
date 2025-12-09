<template>
  <div class="subject-container" v-if="anime">
    <div class="nav-header">
      <el-button link @click="router.back()">← 返回上一页</el-button>
      <el-button v-if="currentUser.role === 0" type="primary" link icon="Edit" @click="router.push('/admin/edit/' + anime.id)">编辑番剧</el-button>
    </div>

    <div class="content-wrapper">
      <div class="left-col">
        <img :src="anime.coverUrl" class="cover-img" />
        <div class="action-box">
          <p>评分: <span class="score">{{ anime.rating }}</span></p>
          <div v-if="currentStatus" style="margin-bottom: 10px; color: #f6a623;">
             当前状态: {{ getStatusText(currentStatus.status) }}
          </div>
          <el-button type="primary" class="w-100" @click="openDialog">
            {{ currentStatus ? '修改收藏' : '加入收藏' }}
          </el-button>
        </div>

        <div class="info-sidebar" v-if="infoBoxList && infoBoxList.length > 0">
          <h3 class="side-title">详细信息</h3>
          <ul class="infobox-list">
            <li v-for="(item, index) in visibleInfoBox" :key="index">
              <span class="label">{{ item.key }}: </span>
              <span class="value">{{ item.value }}</span>
            </li>
          </ul>
          <div class="expand-btn" v-if="infoBoxList.length > 5" @click="toggleInfoExpand">
            查看更多 <el-icon style="margin-left: 4px;"><More /></el-icon>
          </div>
        </div>
      </div>

      <div class="right-col">
        <h1 class="anime-title">{{ anime.title }}</h1>
        
        <div class="summary-box">
          <h3 class="sub-title">剧情简介</h3>
          <p class="summary">{{ anime.summary }}</p>
          <div class="tags-box">
            <el-tag v-for="tag in tagsArray" :key="tag" class="tag-item" effect="plain">{{ tag }}</el-tag>
          </div>
        </div>

        <div class="scroll-section" v-if="cast && cast.length > 0">
          <h3 class="sub-title">角色 & 声优 ({{ cast.length }})</h3>
          <div class="h-scroll">
            <div v-for="c in visibleCast" :key="c.id" class="char-card">
              <el-image :src="c.images ? c.images.grid : ''" class="char-avatar" loading="lazy">
                <template #error><div class="image-slot"><el-icon><UserFilled /></el-icon></div></template>
              </el-image>
              <div class="char-info">
                <div class="char-name" :title="c.name">{{ c.name }}</div>
                <div class="cv-name" v-if="c.actors && c.actors.length > 0">CV: {{ c.actors[0].name }}</div>
              </div>
            </div>
            
            <div v-if="cast.length > 10" class="view-more-card char-more" @click="charDialogVisible = true">
              <div class="view-more-circle"><el-icon><More /></el-icon></div>
              <span class="view-more-text">查看全部</span>
            </div>
          </div>
        </div>

        <div class="scroll-section" v-if="staff && staff.length > 0">
          <h3 class="sub-title">制作阵容 ({{ staff.length }})</h3>
          <div class="h-scroll">
            <div v-for="p in visibleStaff" :key="p.id" class="staff-card">
              <div class="staff-role">{{ p.relation }}</div>
              <div class="staff-name" :title="p.name">{{ p.name }}</div>
            </div>
            
            <div 
              v-if="staff.length > 6" 
              class="view-more-card staff-more" 
              @click="staffDialogVisible = true"
            >
              <div class="view-more-circle"><el-icon><More /></el-icon></div>
              <span class="view-more-text">查看全部</span>
            </div>
          </div>
        </div>

        <div class="ep-section">
          <h3 class="sub-title">章节列表 <span v-if="episodes.length" style="font-weight:normal; font-size:12px; color:#999"> (全{{ episodes.length }}话)</span></h3>
          
          <div v-if="episodes && episodes.length > 0" class="ep-grid">
            <el-popover
              v-for="ep in episodes" 
              :key="ep.id"
              placement="top"
              :width="280"
              trigger="hover"
            >
              <template #reference>
                <div 
                  class="ep-box" 
                  :class="{ 'ep-watched': currentStatus && ep.sort <= currentStatus.progress }"
                  @click="goEpisode(ep.id)"
                >
                  <span class="ep-sort">{{ ep.sort }}</span>
                  <span class="ep-name">{{ ep.name_cn || ep.name }}</span>
                </div>
              </template>

              <div class="pop-content">
                <div class="pop-title">{{ ep.name_cn || ep.name }}</div>
                <div class="pop-info">
                  <span>首播: {{ ep.airdate }}</span>
                  <span v-if="ep.duration">时长: {{ ep.duration }}</span>
                </div>
                <div v-if="ep.desc" style="margin-bottom:10px; line-height:1.4; max-height:100px; overflow-y:auto;">
                  {{ ep.desc.length > 80 ? ep.desc.substring(0, 80) + '...' : ep.desc }}
                </div>
                <div class="pop-actions">
                  <el-button 
                    v-if="!currentStatus || ep.sort > currentStatus.progress" 
                    type="primary" size="small" @click="updateEpStatus(ep.sort)"
                  >看到</el-button>
                  <el-button 
                    v-else 
                    type="warning" size="small" @click="updateEpStatus(ep.sort - 1)"
                  >撤销</el-button>
                  <el-button link size="small" @click="goEpisode(ep.id)">进入详情页</el-button>
                </div>
              </div>
            </el-popover>
          </div>
          <el-empty v-else description="暂无章节数据" />
        </div>

        <el-divider />

        <div class="comment-section">
          <h3>吐槽箱 ({{ comments.length }})</h3>
          <div class="post-box">
            <el-input v-model="commentContent" type="textarea" :rows="3" placeholder="畅所欲言..." />
            <div style="text-align: right; margin-top: 10px;">
              <el-button type="primary" @click="submitComment">发表评论</el-button>
            </div>
          </div>
          <div class="comment-list">
            <el-empty v-if="comments.length === 0" description="抢沙发！" />
            <div v-for="item in comments" :key="item.id" class="comment-item">
              <el-avatar 
                :size="40" 
                :src="item.avatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" 
                style="cursor: pointer;"
                @click="router.push('/user/' + item.userId)"
              />
              <div class="comment-right">
                <div class="comment-user">
                  <span class="nickname" style="cursor: pointer;" @click="router.push('/user/' + item.userId)">{{ item.nickname }}</span>
                  <span class="date">{{ formatTime(item.createTime) }}</span>
                </div>
                <div class="comment-content">{{ item.content }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="dialogVisible" title="标记进度" width="30%">
      <el-form :model="statusForm">
        <el-form-item label="状态">
          <el-radio-group v-model="statusForm.status">
            <el-radio :label="1">想看</el-radio>
            <el-radio :label="3">在看</el-radio>
            <el-radio :label="2">看过</el-radio>
            <el-radio :label="4">搁置</el-radio>
            <el-radio :label="5">抛弃</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="观看进度">
          <div style="display: flex; align-items: center; gap: 10px;">
            <el-input-number 
              v-model="statusForm.progress" 
              :min="0" 
              :max="anime.totalEpisodes || 999" 
              controls-position="right"
              style="width: 120px;" 
            />
            <span style="font-size: 12px; color: #666;">
              / 共 {{ anime.totalEpisodes || '?' }} 集
            </span>
          </div>
        </el-form-item>
        <el-form-item label="我的评分"><el-rate v-model="statusForm.score" :max="10" show-score /></el-form-item>
        <el-form-item label="简评"><el-input v-model="statusForm.comment" type="textarea" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitStatus">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="infoDialogVisible" title="全部详细信息" width="500px">
      <ul class="infobox-list full-list">
        <li v-for="(item, index) in infoBoxList" :key="index">
          <span class="label">{{ item.key }}: </span>
          <span class="value">{{ item.value }}</span>
        </li>
      </ul>
    </el-dialog>

    <el-dialog v-model="charDialogVisible" title="全部角色 & 声优" width="800px">
      <div class="char-grid-full">
        <div v-for="c in cast" :key="c.id" class="char-card-full">
          <el-image :src="c.images ? c.images.grid : ''" class="char-avatar-full" loading="lazy">
            <template #error><div class="image-slot"><el-icon><UserFilled /></el-icon></div></template>
          </el-image>
          <div class="char-info-full">
            <div class="char-name-full">{{ c.name }}</div>
            <div class="cv-name-full" v-if="c.actors && c.actors.length > 0">
              <span class="role-tag">{{ c.role || c.relation }}</span>
              CV: {{ c.actors[0].name }}
            </div>
          </div>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="staffDialogVisible" title="全部制作阵容" width="700px">
      <div class="staff-group-container">
        <div v-for="group in groupedStaff" :key="group.role" class="staff-group">
          <div class="group-title">{{ group.role }}</div>
          <div class="staff-grid-full">
            <div v-for="p in group.persons" :key="p.id" class="staff-card-full">
              <div class="staff-name-full">{{ p.name }}</div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>

  </div>
</template>

<script setup>
import { useSubjectLogic } from './js/SubjectLogic.js'
import { UserFilled, More, Edit } from '@element-plus/icons-vue'

const {
  router, anime, tagsArray, dialogVisible, currentStatus, statusForm, comments, commentContent,
  staff, cast, episodes,
  infoBoxList, visibleInfoBox, infoDialogVisible, toggleInfoExpand,
  charDialogVisible, visibleCast,
  staffDialogVisible, visibleStaff, 
  groupedStaff, currentUser, // 👈 确保导出 currentUser
  getStatusText, formatTime, openDialog, submitStatus, submitComment,
  goEpisode, updateEpStatus
} = useSubjectLogic()
</script>

<style scoped>
@import './css/Subject.css';
</style>