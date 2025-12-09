<template>
  <div class="discussion-container">
    
    <!-- 导航栏 -->
    <div class="discussion-nav">
      <h2>💬 动态广场</h2>
      <el-button type="primary" plain @click="router.push('/journal')">
        <el-icon><Notebook /></el-icon> 日志广场
      </el-button>
    </div>

    <div class="post-editor-card">
      <div class="editor-header">
        <h3>发布新帖</h3>
        <div class="topic-selector">
          <span class="label">话题:</span>
          <el-select v-model="postForm.topicType" placeholder="选择话题" style="width: 140px" @change="handleTopicChange">
            <el-option label="🌊 闲聊灌水" value="闲聊" />
            <el-option label="📺 番剧讨论" value="番剧" />
            <el-option label="#️⃣ 自定义话题" value="自定义" />
          </el-select>

          <el-select 
            v-if="postForm.topicType === '番剧'" 
            v-model="postForm.animeId" 
            filterable remote 
            placeholder="搜索番剧名..." 
            :remote-method="searchAnime"
            :loading="searchLoading"
            style="width: 200px; margin-left: 10px;"
          >
            <el-option v-for="item in animeOptions" :key="item.id" :label="item.title" :value="item.id" />
          </el-select>

          <el-input 
            v-if="postForm.topicType === '自定义'" 
            v-model="postForm.customTopic" 
            placeholder="#输入话题" 
            style="width: 200px; margin-left: 10px;" 
          />
        </div>
      </div>

      <div class="title-row">
        <input v-model="postForm.title" class="clean-input" placeholder="请输入标题（选填）" maxlength="30" />
        <span class="word-count">{{ postForm.title.length }}/30</span>
      </div>

      <div class="markdown-toolbar">
        <el-tooltip content="加粗"><div class="tool-btn" @click="addBold"><b>B</b></div></el-tooltip>
        <el-tooltip content="斜体"><div class="tool-btn italic" @click="addItalic">I</div></el-tooltip>
        <el-tooltip content="删除线"><div class="tool-btn strike" @click="addDelete">S</div></el-tooltip>
        <div class="divider"></div>
        <el-tooltip content="大标题"><div class="tool-btn" @click="addHeading(2)">H2</div></el-tooltip>
        <el-tooltip content="插入链接"><div class="tool-btn" @click="addLink"><el-icon><Link /></el-icon></div></el-tooltip>
      </div>

      <div class="content-wrapper">
        <textarea
          ref="contentInputRef"
          v-model="postForm.content"
          class="clean-textarea"
          placeholder="分享你的二次元生活... (支持 Markdown)"
          rows="6"
        ></textarea>
      </div>

      <div class="editor-footer">
        <div class="left-tools">
          <el-popover placement="bottom" :width="300" trigger="click">
            <template #reference>
              <div class="footer-btn">
                <el-icon size="18">
                  <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                    <path fill="currentColor" d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z"></path>
                    <path fill="currentColor" d="M288 421a48 48 0 1 0 96 0 48 48 0 1 0-96 0zm352 0a48 48 0 1 0 96 0 48 48 0 1 0-96 0z"></path>
                    <path fill="currentColor" d="M512 736c-88.4 0-160-71.6-160-160h320c0 88.4-71.6 160-160 160z"></path>
                  </svg>
                </el-icon>
                 表情
              </div>
            </template>
            <div class="emoji-picker-wrapper">
              <span v-for="emoji in emojiList" :key="emoji" class="emoji-item" @click="addEmoji(emoji)">{{ emoji }}</span>
            </div>
          </el-popover>
          
          <el-upload action="" :http-request="handleImageUpload" :show-file-list="false" accept="image/*" style="display: flex; align-items: center;">
            <div class="footer-btn"><el-icon size="18"><Picture /></el-icon> 图片</div>
          </el-upload>
        </div>
        <el-button type="primary" round style="width: 100px;" @click="submitPost">发布</el-button>
      </div>
    </div>

    <div class="post-list">
      <div class="list-header">
        <div class="header-left">
          <span>最新动态</span>
          <el-radio-group v-model="filterType" size="small" @change="loadPosts">
            <el-radio-button label="全部" />
            <el-radio-button label="番剧" />
            <el-radio-button label="闲聊" />
          </el-radio-group>
        </div>
        <div class="header-right">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索帖子..."
            prefix-icon="Search"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
            style="width: 200px"
            size="small"
          />
          <el-button size="small" type="primary" plain @click="handleSearch">搜索</el-button>
        </div>
      </div>

      <el-empty v-if="postList.length === 0" description="暂无帖子" />
      
      <div v-else class="post-grid" v-infinite-scroll="loadMore" :infinite-scroll-disabled="loading || noMore" :infinite-scroll-distance="10">
        <el-card v-for="item in postList" :key="item.id" class="post-card" shadow="hover">
<div class="post-header">
            <div class="user-info">
              <el-avatar 
                :size="40" 
                :src="item.avatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" 
                style="cursor: pointer;"
                @click="router.push('/user/' + item.userId)"
              />
              <div class="meta">
                <span class="nickname" style="cursor: pointer;" @click="router.push('/user/' + item.userId)">{{ item.nickname }}</span>
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
                <span v-if="item.episodeTitle" style="margin-left: 5px; font-weight: bold;">#{{ item.episodeTitle }}</span>
              </el-tag>
              
              <el-tag v-else-if="item.title && item.title.startsWith('#')" size="small" type="warning" effect="light">
                {{ item.title.split(' ')[0] }}
              </el-tag>
              
              <el-tag v-else size="small" type="info" effect="light">🌊 闲聊</el-tag>

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
            <h3 v-if="item.title && !item.title.startsWith('#')" class="post-title">{{ item.title }}</h3>
            <h3 v-if="item.title && item.title.startsWith('#')" class="post-title">
               {{ item.title.substring(item.title.indexOf(' ')+1) }}
            </h3>
            <div class="post-text markdown-body" v-html="renderMarkdown(item.content)"></div>
          </div>
          <div class="action-left">

       <div class="post-footer">
            <div class="action-btn" @click="toggleReply(item)">
              <el-icon><ChatLineRound /></el-icon> 
              {{ item.replyCount > 0 ? item.replyCount : '评论' }}
            </div>
            
            <div class="action-btn" @click="likePost(item)">
              <el-icon><Pointer /></el-icon> {{ item.likes || 0 }}
            </div>
          </div>

          </div>
   

          <div class="reply-area" v-if="item.showReply">
            <div class="reply-input-box">
              <el-input v-model="item.replyContent" placeholder="回复楼主..." size="small" />
              <el-button type="primary" size="small" @click="submitReply(item)">发送</el-button>
            </div>
            <div class="reply-list">
              <div v-for="reply in item.replies" :key="reply.id" class="reply-item">
                <img 
                  :src="reply.avatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" 
                  class="reply-avatar" 
                  style="cursor: pointer;"
                  @click="router.push('/user/' + reply.userId)"
                />
                <div class="reply-content">
                  <span class="reply-nick" style="cursor: pointer;" @click="router.push('/user/' + reply.userId)">{{ reply.nickname }}:</span>
                  <span class="reply-text">{{ reply.content }}</span>
                  <span class="reply-time">{{ formatTime(reply.createTime) }}</span>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <el-dialog v-model="editDialogVisible" title="修改帖子" width="500px">
      <el-input v-model="editForm.content" type="textarea" :rows="5" />
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitEditPost">保存</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { useDiscussionLogic } from './js/DiscussionLogic.js'
import { useRouter } from 'vue-router'
import { Search, ChatLineRound, Pointer, Picture, Link, Edit, More, ArrowDown, CollectionTag, Notebook } from '@element-plus/icons-vue'

const router = useRouter()

const {
  postList, currentUser, filterType, postForm, searchLoading, animeOptions, emojiList, contentInputRef,
  editDialogVisible, editForm, searchKeyword, loading, noMore,
  loadPosts, searchAnime, handleTopicChange, addEmoji, submitPost, formatTime, handleSearch, loadMore,
  addBold, addItalic, addDelete, addHeading, addLink, handleImageUpload, renderMarkdown,
  deletePost, openEditPost, submitEditPost, likePost, toggleReply, submitReply
} = useDiscussionLogic()

const handleTopicCommand = (cmd) => {
  postForm.topicType = cmd
  handleTopicChange()
}

const handleTagClick = (item) => {
  if (item.animeId && item.episodeId) {
    router.push(`/play/${item.animeId}/${item.episodeId}`)
  } else if (item.animeId) {
    router.push(`/subject/${item.animeId}`)
  }
}
</script>

<style scoped>
@import './css/Discussion.css';

.list-header {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
</style>