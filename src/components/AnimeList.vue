<template>
  <div class="list-container">
    <el-empty v-if="!list || list.length === 0" description="暂无相关收藏" />
    
    <div class="anime-grid" v-else>
      <div 
        v-for="item in list" 
        :key="item.status.id" 
        class="anime-card"
        @click="goDetail(item.anime.id)"
      >
        <div class="cover-wrapper">
          <img :src="item.anime.coverUrl" class="cover-img" />
          <div class="status-tag">{{ getStatusText(item.status.status) }}</div>
        </div>
        
        <div class="info-section">
          <h3 class="title" :title="item.anime.title">{{ item.anime.title }}</h3>
          
          <div class="progress-row">
            <span class="ep-info">
              看到 <strong>{{ item.status.progress || 0 }}</strong> / {{ item.anime.totalEpisodes || '?' }} 话
            </span>
            <el-progress 
              :percentage="calculatePercentage(item.status.progress, item.anime.totalEpisodes)" 
              :stroke-width="6" 
              :show-text="false"
              class="progress-bar"
            />
          </div>

          <div class="meta-row">
            <div v-if="Number(item.status.score) > 0">
              <el-rate 
                :model-value="Number(item.status.score)" 
                disabled 
                show-score 
                text-color="#ff9900" 
                score-template="{value}分"
                
                :max="10"
                void-icon="StarFilled"
                :icons="['StarFilled', 'StarFilled', 'StarFilled']"
                
                disabled-void-color="#dcdfe6"
                size="small"
                class="custom-rate"
              />
            </div>
            <div v-else class="unrated-text">
              未评分
            </div>
            <span class="date">{{ formatTime(item.status.updateTime) }} 更新</span>
          </div>

          <div class="comment-box" v-if="item.status.comment">
            <el-icon><ChatLineSquare /></el-icon>
            <span class="comment-text">{{ item.status.comment }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
// 👇 只需要引入这一个普通图标用于评论区，星星直接用字符串引用
import { ChatLineSquare } from '@element-plus/icons-vue'

const props = defineProps(['list']) 
const router = useRouter()

const goDetail = (id) => {
  router.push('/subject/' + id)
}

const formatTime = (timeStr) => {
  if (!timeStr) return ''
  return timeStr.split('T')[0]
}

const calculatePercentage = (current, total) => {
  if (!current || !total) return 0
  const percent = Math.floor((current / total) * 100)
  return percent > 100 ? 100 : percent
}

const getStatusText = (code) => {
  const map = {1: '想看', 2: '看过', 3: '在看', 4: '搁置', 5: '抛弃'}
  return map[code] || ''
}
</script>

<style scoped>
.list-container { padding: 10px; }
.anime-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
.anime-card { background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 12px; display: flex; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
.anime-card:hover { transform: translateY(-3px); box-shadow: 0 8px 16px rgba(0,0,0,0.08); border-color: #dcdfe6; }
.cover-wrapper { position: relative; flex-shrink: 0; width: 80px; height: 110px; margin-right: 15px; }
.cover-img { width: 100%; height: 100%; object-fit: cover; border-radius: 6px; }
.status-tag { position: absolute; top: 0; left: 0; background: rgba(64, 158, 255, 0.9); color: #fff; font-size: 10px; padding: 2px 6px; border-top-left-radius: 6px; border-bottom-right-radius: 6px; }
.info-section { flex: 1; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; }
.title { margin: 0 0 5px 0; font-size: 15px; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.progress-row { margin-bottom: 8px; }
.ep-info { font-size: 12px; color: #666; display: block; margin-bottom: 4px; }
.progress-bar { width: 100%; }

/* 评分行样式优化 */
.meta-row { display: flex; justify-content: space-between; align-items: center; }
/* 强制 el-rate 不换行 */
.custom-rate { white-space: nowrap; transform: scale(0.9); transform-origin: left center; }

.date { font-size: 12px; color: #999; }
.comment-box { margin-top: 8px; background: #f5f7fa; padding: 4px 8px; border-radius: 4px; font-size: 12px; color: #666; display: flex; align-items: center; gap: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.unrated-text { font-size: 13px; color: #909399; margin-right: 5px; }
</style>