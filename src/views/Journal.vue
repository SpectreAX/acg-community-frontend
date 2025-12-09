<template>
  <div class="journal-container">
    
    <!-- 导航栏 -->
    <div class="journal-nav">
      <h2>📝 日志广场</h2>
      <div class="nav-actions">
        <el-button type="default" size="small" @click="$router.push('/discussion')">
          <el-icon><Back /></el-icon> 动态广场
        </el-button>
        <el-input
          v-model="searchKeyword"
          placeholder="搜索日志..."
          prefix-icon="Search"
          clearable
          @clear="handleSearch"
          @keyup.enter="handleSearch"
          style="width: 180px"
          size="small"
        />
        <el-button size="small" type="primary" plain @click="handleSearch">搜索</el-button>
        <el-button size="small" type="primary" @click="$router.push('/article/publish')">
          <el-icon><EditPen /></el-icon> 写日志
        </el-button>
      </div>
    </div>

    <div class="post-list">
      <el-empty v-if="postList.length === 0 && !loading" description="暂无日志" />
      
      <div v-else class="post-grid" v-infinite-scroll="loadMore" :infinite-scroll-disabled="loading || noMore" :infinite-scroll-distance="10">
        <el-card v-for="item in postList" :key="item.id" class="post-card" shadow="hover">
          <div class="post-header">
            <div class="user-info">
              <el-avatar 
                :size="40" 
                :src="item.avatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" 
                style="cursor: pointer;"
                @click="$router.push('/user/' + item.userId)"
              />
              <div class="meta">
                <span class="nickname" style="cursor: pointer;" @click="$router.push('/user/' + item.userId)">{{ item.nickname }}</span>
              </div>
            </div>
            
            <div class="post-right">
              <el-tag 
                v-if="item.animeTitle" 
                size="small" 
                type="success" 
                effect="light"
                style="cursor: pointer;"
                @click="handleTagClick(item)"
              >
                📺 {{ item.animeTitle }}
              </el-tag>

              <el-dropdown v-if="currentUser.id === item.userId || currentUser.role === 0" trigger="click">
                <el-icon class="more-actions"><More /></el-icon>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-if="currentUser.id === item.userId" @click="openEditPost(item)">编辑</el-dropdown-item>
                    <el-dropdown-item style="color: #f56c6c" @click="deletePost(item)">删除</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>

          <div class="post-content">
            <h3 v-if="item.title" class="post-title">{{ item.title }}</h3>
            <div class="post-text markdown-body" v-html="renderMarkdown(item.content)"></div>
          </div>

          <div class="post-footer">
            <div class="action-left">
              <div class="action-btn" @click="toggleReply(item)">
                <el-icon><ChatLineRound /></el-icon> 
                {{ item.replyCount > 0 ? item.replyCount : '评论' }}
              </div>
              
              <div class="action-btn" @click="likePost(item)">
                <el-icon><Pointer /></el-icon> {{ item.likes || 0 }}
              </div>
            </div>
            <span class="footer-time">{{ formatTime(item.createTime) }}</span>
          </div>

          <div class="reply-area" v-if="item.showReply">
            <div class="reply-input-box">
              <el-input v-model="item.replyContent" placeholder="回复..." size="small" />
              <el-button type="primary" size="small" @click="submitReply(item)">发送</el-button>
            </div>
            <div class="reply-list">
              <div v-for="reply in item.replies" :key="reply.id" class="reply-item">
                <img 
                  :src="reply.avatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" 
                  class="reply-avatar" 
                  style="cursor: pointer;"
                  @click="$router.push('/user/' + reply.userId)"
                />
                <div class="reply-content">
                  <span class="reply-nick" style="cursor: pointer;" @click="$router.push('/user/' + reply.userId)">{{ reply.nickname }}:</span>
                  <span class="reply-text">{{ reply.content }}</span>
                  <span class="reply-time">{{ formatTime(reply.createTime) }}</span>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </div>

      <div v-if="loading" style="text-align: center; padding: 20px; color: #999;">加载中...</div>
      <div v-if="noMore && postList.length > 0" style="text-align: center; padding: 20px; color: #ccc;">没有更多了</div>
    </div>

  </div>
</template>

<script setup>
import { useJournalLogic } from './js/JournalLogic.js'
import { useRouter } from 'vue-router'
import { Search, ChatLineRound, Pointer, More, EditPen, Back } from '@element-plus/icons-vue'

const router = useRouter()

const {
  postList, currentUser, searchKeyword, loading, noMore,
  loadPosts, formatTime, handleSearch, loadMore,
  renderMarkdown,
  deletePost, openEditPost, likePost, toggleReply, submitReply
} = useJournalLogic()

const handleTagClick = (item) => {
  if (item.animeId && item.episodeId) {
    router.push(`/play/${item.animeId}/${item.episodeId}`)
  } else if (item.animeId) {
    router.push(`/subject/${item.animeId}`)
  }
}
</script>

<style scoped>
@import './css/Journal.css';
</style>
