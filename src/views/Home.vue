<template>
  <div class="home-background">
    
    <div class="home-content">
      
      <div class="my-section" v-if="user.id && myWatchingList.length > 0">
        <h3 class="section-title">我的追番 <span style="font-size:14px; color:#999; font-weight:normal">(正在追 {{ myWatchingList.length }} 部)</span></h3>
        
        <div class="watching-grid">
          <div v-for="item in myWatchingList" :key="item.anime.id" class="watching-card">
            <img :src="item.anime.coverUrl" class="watching-cover" @click="goDetail(item.anime.id)"/>
            
            <div class="watching-info">
              <h4 @click="goDetail(item.anime.id)">{{ item.anime.title }}</h4>
              <div class="progress-box">
                <span class="ep-text">看到第 <strong>{{ item.status.progress || 0 }}</strong> 集</span>
                <el-progress 
                  :percentage="calculatePercentage(item.status.progress, item.anime.totalEpisodes)" 
                  :stroke-width="6" 
                  :show-text="false"
                  style="margin: 8px 0;"
                />
              </div>
              
              <div class="btn-row">
                <span class="total-ep">全 {{ item.anime.totalEpisodes || '?' }} 集</span>
                <div class="controls">
                  <el-dropdown trigger="click" @command="(cmd) => handleStatusChange(cmd, item)">
                    <span class="status-link">
                      在看 <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                    </span>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="1">想看</el-dropdown-item>
                        <el-dropdown-item command="2">看过</el-dropdown-item>
                        <el-dropdown-item command="3" disabled>在看</el-dropdown-item>
                        <el-dropdown-item command="4">搁置</el-dropdown-item>
                        <el-dropdown-item command="5">抛弃</el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                  <el-button 
                    type="primary" 
                    size="small" 
                    circle 
                    :disabled="item.status.progress >= item.anime.totalEpisodes"
                    @click="updateProgress(item)"
                    style="margin-left: 10px;"
                  >
                    +1
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="content-area">
        <h3 class="section-title">热门番剧</h3>
        
        <div class="anime-grid">
          <el-card 
            v-for="item in displayList" 
            :key="item.id" 
            class="anime-card"
            :body-style="{ padding: '0px' }"
            shadow="hover"
            @click="goDetail(item.id)"
          >
            <div class="image-wrapper">
              <img :src="item.coverUrl" class="image" />
              <div class="rating-badge">{{ item.rating }}</div>
            </div>
            <div class="card-content">
              <span class="title" :title="item.title">{{ item.title }}</span>
              <p class="summary-text">{{ item.summary }}</p>
              <div class="bottom">
                <el-tag size="small" effect="plain" :type="getPlatformType(item.platform)">
                  {{ item.platform || 'TV动画' }}
                </el-tag>
                <el-button type="primary" link class="button">查看详情</el-button>
              </div>
            </div>
          </el-card>
        </div>

        <el-empty v-if="allAnimes.length === 0" description="没有找到相关番剧" />

        <div class="load-more-box" v-if="hasMore">
          <el-button round size="large" @click="loadMore" :loading="loadingMore">
            加载更多 ({{ displayList.length }}/{{ allAnimes.length }})
          </el-button>
        </div>
        <div class="no-more-text" v-if="!hasMore && allAnimes.length > 0">
          已经到底啦 ~
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { useHomeLogic } from './js/HomeLogic.js'
import { ArrowDown } from '@element-plus/icons-vue'

const {
  user, displayList, allAnimes, myWatchingList, loadingMore, hasMore,
  loadMore, goDetail, getPlatformType, handleStatusChange, updateProgress, calculatePercentage
} = useHomeLogic()
</script>

<style scoped>
@import './css/Home.css';
</style>