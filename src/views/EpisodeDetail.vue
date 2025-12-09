<template>
  <div class="ep-container">
    <div class="main-content">
      <div class="breadcrumb">
        <el-button link @click="goBackSubject">
          <el-icon><ArrowLeft /></el-icon> 返回番剧详情
        </el-button>
        <span class="divider">/</span>
        <span class="curr-title" v-if="currentEp">第 {{ currentEp.sort }} 话</span>
      </div>

      <div class="video-container">
        <template v-if="currentUser.id">
          <div class="prism-player" id="J_prismPlayer"></div>
        </template>
        <div v-else class="login-placeholder">
          <el-empty description="请登录后观看视频">
            <el-button type="primary" @click="router.push('/login')">去登录</el-button>
          </el-empty>
        </div>
      </div>

      <div class="ep-info" v-if="currentEp">
        <h1 class="ep-title">{{ currentEp.name_cn || currentEp.name }}</h1>
        <div class="ep-meta">
          <span class="date">首播: {{ currentEp.airdate }}</span>
          <span class="duration" v-if="currentEp.duration">时长: {{ currentEp.duration }}</span>
        </div>
        
        <el-divider content-position="left">本集剧情</el-divider>
        
        <div class="ep-desc">
          {{ currentEp.desc || '暂无本集简介' }}
        </div>
      </div>
      <el-empty v-else description="正在加载单集信息..." />

      <div class="comment-section">
        <h3>讨论区</h3>
        <div class="post-box">
          <el-input v-model="commentContent" type="textarea" :rows="3" placeholder="发表你对本集的看法..." />
          <div style="text-align: right; margin-top: 10px;">
            <el-button type="primary" @click="submitComment">发表评论</el-button>
          </div>
        </div>
        <div class="comment-list">
          <div v-for="item in comments" :key="item.id" class="comment-item">
            <el-avatar :size="40" :src="item.avatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" />
            <div class="comment-right">
              <div class="comment-user">
                <span class="nickname">{{ item.nickname }}</span>
                <span class="date">{{ formatTime(item.createTime) }}</span>
              </div>
              <div class="comment-content">{{ item.content }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="sidebar">
      <div class="sidebar-header">
        <h3>选集</h3>
        <span class="ep-count">全{{ episodeList.length }}话</span>
      </div>
      
      <div class="ep-list-vertical" v-loading="loading">
        <div 
          v-for="ep in episodeList" 
          :key="ep.id" 
          class="ep-item"
          :class="{ 'active': ep.id == currentEpId }"
          @click="switchEpisode(ep.id)"
        >
          <span class="ep-num">{{ ep.sort }}</span>
          <span class="ep-text">{{ ep.name_cn || ep.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useEpisodeDetailLogic } from './js/EpisodeDetailLogic.js'
import { ArrowLeft } from '@element-plus/icons-vue'
import { onMounted, onBeforeUnmount, watch } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'

const {
  router, episodeList, currentEp, currentEpId, loading,
  comments, commentContent,
  switchEpisode, goBackSubject, submitComment, formatTime,
  currentUser
} = useEpisodeDetailLogic()

let player = null

// 从后端获取播放凭证
const fetchPlayAuth = async (videoId) => {
  try {
    const response = await axios.get(`/api/video/play-auth/${videoId}`)
    if (response.data.code === '200') {
      return response.data.data
    } else {
      console.error('获取播放凭证API返回错误:', response.data)
      ElMessage.error('获取播放凭证失败: ' + response.data.msg)
      return null
    }
  } catch (error) {
    console.error('获取播放凭证失败:', error)
    ElMessage.error('获取播放凭证失败，请稍后重试')
    return null
  }
}

// 初始化播放器
const initPlayer = async () => {
  if (!window.Aliplayer) {
    console.warn('Aliplayer SDK 未加载')
    return
  }

  // 检查是否登录
  if (!currentUser.id) {
    console.warn('用户未登录，无法播放视频')
    return
  }

  console.log('🔍 当前集数据 currentEp.value:', currentEp.value)

  // 销毁之前的播放器实例
  if (player) {
    player.dispose()
    player = null
  }

  // 使用当前集的 videoId
  const videoId = currentEp.value?.videoId ? currentEp.value.videoId.trim() : null
  
  console.log(`🔍 提取的 videoId: "${videoId}"`)
  
  if (!videoId) {
    console.warn('⚠️ 当前集数未配置视频源 - videoId 为空')
    ElMessage.info('当前集数暂未上传视频')
    return
  }
  
  console.log(`✅ 正在获取视频播放凭证, videoId: "${videoId}"`)

  // 从后端获取播放凭证
  const playAuthData = await fetchPlayAuth(videoId)
  
  if (!playAuthData || !playAuthData.playAuth) {
    ElMessage.error('无法获取播放凭证')
    return
  }

  console.log('✅ 成功获取播放凭证，初始化播放器...')

  // 使用动态获取的 playAuth 初始化播放器
  player = new window.Aliplayer({
    id: "J_prismPlayer",
    autoplay: true,
    width: "100%",
    height: "100%",
    vid: videoId,
    playauth: playAuthData.playAuth,
    cover: playAuthData.videoMeta?.coverUrl || '',
    encryptType: 1,
    license: {
      domain: "spectreax.com",
      key: "xP9VKwtoMk14sJcPO37e2a619e3454c32846cf8f1b0ae3c08"
    }
  }, function (player) {
    console.log("✅ 播放器创建成功")
  })
}

const loadAliplayerSDK = () => {
  if (document.getElementById('aliplayer-css')) {
    console.log('📦 Aliplayer SDK 已存在')
    if (window.Aliplayer && currentEp.value) {
      console.log('✅ SDK和数据都已准备好，初始化播放器')
      initPlayer()
    }
    return
  }

  console.log('📥 开始加载 Aliplayer SDK...')

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = '//g.alicdn.com/apsara-media-box/imp-web-player/2.28.5/skins/default/aliplayer-min.css'
  link.id = 'aliplayer-css'
  document.head.appendChild(link)

  const script = document.createElement('script')
  script.type = 'text/javascript'
  script.src = '//g.alicdn.com/apsara-media-box/imp-web-player/2.28.5/aliplayer-min.js'
  script.id = 'aliplayer-js'
  script.onload = () => {
    console.log('✅ Aliplayer SDK 加载完成')
    if (currentEp.value) {
      console.log('✅ 数据已准备好，初始化播放器')
      initPlayer()
    } else {
      console.log('⏳ 等待集数据加载...')
    }
  }
  document.head.appendChild(script)
}

// 监听 currentEp 变化，重新初始化播放器
watch(currentEp, (newEp) => {
  console.log('🔄 currentEp 变化，触发播放器初始化', newEp)
  if (newEp && window.Aliplayer) {
    console.log('✅ 数据已加载，开始初始化播放器')
    initPlayer()
  }
}, { immediate: false })

onMounted(() => {
  console.log('🚀 组件已挂载，开始加载 Aliplayer SDK')
  loadAliplayerSDK()
})

onBeforeUnmount(() => {
  if (player) {
    player.dispose()
    player = null
  }
})
</script>

<style scoped>
@import './css/EpisodeDetail.css';

.login-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  border-radius: 8px;
}
</style>