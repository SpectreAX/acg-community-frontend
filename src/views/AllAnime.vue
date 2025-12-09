<template>
  <div class="all-anime-container">
    <div class="page-header">
      <h1>全部动画</h1>
      <div class="sort-bar">
        <span>排序：</span>
        <el-radio-group v-model="filterForm.sort" size="small">
          <el-radio-button v-for="opt in sortOptions" :key="opt.value" :label="opt.value">
            {{ opt.label }}
          </el-radio-button>
        </el-radio-group>
        
        <div class="sort-order-btn" @click="toggleOrder" title="切换升降序">
          <el-icon v-if="filterForm.order === 'desc'"><SortDown /></el-icon>
          <el-icon v-else><SortUp /></el-icon>
        </div>
      </div>
    </div>

    <div class="content-wrapper">
      <!-- 左侧列表 (仿Bangumi竖向布局) -->
      <div class="anime-list-col">
        <div v-if="loading" style="padding: 20px; text-align: center;">加载中...</div>
        <el-empty v-else-if="list.length === 0" description="没有找到相关番剧" />
        
        <div v-else class="anime-item" v-for="item in list" :key="item.id">
          <div class="cover-wrapper" @click="goToDetail(item.id)">
            <img :src="item.coverUrl" loading="lazy" />
          </div>
          <div class="info-wrapper">
            <h3 class="title">
              <span class="title-text" @click="goToDetail(item.id)">{{ item.title }}</span>
              <span class="rank-badge" v-if="item.rating >= 9.0">Rank S</span>
            </h3>
            <div class="meta-row">
              <span class="info-text">{{ item.totalEpisodes ? item.totalEpisodes + '话' : '未知' }}</span>
              <span class="divider">/</span>
              <span class="info-text">{{ item.infoBox ? (item.infoBox.match(/(\d{4}年\d{1,2}月\d{1,2}日)/) || [''])[0] : '' }}</span>
            </div>
            <div class="tags-row">
              <el-tag v-for="tag in (item.tags ? item.tags.split(',').slice(0,4) : [])" :key="tag" size="small" effect="plain" class="tag">
                {{ tag }}
              </el-tag>
            </div>
            <div class="rating-row">
              <el-icon color="#f6a623"><StarFilled /></el-icon>
              <span class="score">{{ formatRating(item.rating) }}</span>

            </div>
          </div>
        </div>
        
        <!-- 简单的分页 -->
        <div class="pagination-bar" v-if="list.length > 0">
           <el-button :disabled="filterForm.page <= 1" @click="filterForm.page--; handlePageChange(filterForm.page)">上一页</el-button>
           <span style="margin: 0 10px;">第 {{ filterForm.page }} 页</span>
           <el-button @click="filterForm.page++; handlePageChange(filterForm.page)">下一页</el-button>
        </div>
      </div>

      <!-- 右侧筛选栏 -->
      <div class="filter-sidebar">
        <div class="filter-group">
          <div class="filter-title">分类</div>
          <div class="filter-tags">
             <span 
              v-for="c in categoryOptions" :key="c" 
              class="filter-tag" 
              :class="{ active: filterForm.category === c }"
              @click="filterForm.category = c"
            >{{ c }}</span>
          </div>
        </div>

        <div class="filter-group">
          <div class="filter-title">来源</div>
          <div class="filter-tags">
             <span 
              v-for="s in sourceOptions" :key="s" 
              class="filter-tag" 
              :class="{ active: filterForm.source === s }"
              @click="filterForm.source = s"
            >{{ s }}</span>
          </div>
        </div>

        <div class="filter-group">
          <div class="filter-title">类型</div>
          <div class="filter-tags">
             <span 
              v-for="g in genreOptions" :key="g" 
              class="filter-tag" 
              :class="{ active: filterForm.genre === g }"
              @click="filterForm.genre = g"
            >{{ g }}</span>
          </div>
        </div>

        <div class="filter-group">
          <div class="filter-title">地区</div>
          <div class="filter-tags">
             <span 
              v-for="r in regionOptions" :key="r" 
              class="filter-tag" 
              :class="{ active: filterForm.region === r }"
              @click="filterForm.region = r"
            >{{ r }}</span>
          </div>
        </div>

        <div class="filter-group">
          <div class="filter-title">年份</div>
          <div class="filter-tags">
            <span 
              v-for="y in yearOptions" :key="y" 
              class="filter-tag" 
              :class="{ active: filterForm.year === y }"
              @click="filterForm.year = y"
            >{{ y }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { StarFilled, SortUp, SortDown } from '@element-plus/icons-vue'
import { useAllAnimeLogic } from './js/AllAnimeLogic.js'

const {
  list, loading, filterForm,

  yearOptions, genreOptions, sortOptions, regionOptions, categoryOptions, sourceOptions,
  handlePageChange, goToDetail, formatRating, toggleOrder
} = useAllAnimeLogic()
</script>

<style scoped>
.all-anime-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 20px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}
.sort-bar {
  display: flex;
  align-items: center;
}
.sort-order-btn {
  margin-left: 10px;
  cursor: pointer;
  color: #666;
  font-size: 16px;
  display: flex;
  align-items: center;
}
.sort-order-btn:hover {
  color: #409eff;
}
.content-wrapper {
  display: flex;
  gap: 30px;
}
.anime-list-col {
  flex: 1;
}
.filter-sidebar {
  width: 280px;
  background: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  height: fit-content;
}

/* 列表项样式 (仿Bangumi) */
.anime-item {
  display: flex;
  padding: 15px;
  border-bottom: 1px solid #f0f0f0;
  transition: all 0.2s;
}
.anime-item:hover {
  background: #fafafa;
}
.cover-wrapper {
  width: 90px;
  height: 120px;
  flex-shrink: 0;
  cursor: pointer;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}
.cover-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.info-wrapper {
  flex: 1;
  padding-left: 15px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.title {
  margin: 0 0 5px 0;
  font-size: 16px;
  color: #0084b4; /* Bangumi Blue */
  display: flex;
  align-items: center;
}
.title-text {
  cursor: pointer;
}
.title-text:hover {
  text-decoration: underline;
}
.rank-badge {
  background: #ff0055;
  color: white;
  font-size: 10px;
  padding: 2px 5px;
  border-radius: 3px;
  margin-left: 10px;
  cursor: default;
}
.meta-row {
  font-size: 13px;
  color: #666;
  margin-bottom: 5px;
}
.divider {
  margin: 0 5px;
  color: #ddd;
}
.tags-row {
  display: flex;
  gap: 5px;
  margin-bottom: 5px;
}
.rating-row {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #f6a623;
  font-weight: bold;
}

/* 侧边栏筛选样式 */
.filter-group {
  margin-bottom: 25px;
}
.filter-title {
  font-weight: bold;
  margin-bottom: 10px;
  color: #333;
}
.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.filter-tag {
  padding: 4px 10px;
  background: white;
  border-radius: 12px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #eee;
}
.filter-tag:hover {
  color: #409eff;
  border-color: #c6e2ff;
}
.filter-tag.active {
  background: #409eff;
  color: white;
  border-color: #409eff;
}

.pagination-bar {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
