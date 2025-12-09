<template>
  <div class="profile-container">
    
    <div class="profile-header">
      <div class="avatar-box">
        <el-avatar :size="100" :src="userInfo.avatar || defaultAvatar" />
        <el-button v-if="userInfo.id === currentUser.id" class="edit-btn" type="primary" circle :icon="Edit" size="small" @click="openEdit" />
      </div>
      
      <div class="user-details">
        <div class="header-top-row">
            <h1 class="nickname">
               {{ userInfo.nickname }} 
               <span class="uid">#{{ userInfo.id }}</span>
            </h1>
            
           <!-- Friend Action Buttons -->
           <div class="friend-actions">
             <template v-if="friendStatus !== -1">
             <el-button v-if="friendStatus === 0" type="primary" :icon="Plus" @click="sendFriendRequest" round>添加好友</el-button>
             
             <!-- Interactive Friend Status Dropdown -->
             <el-dropdown v-if="friendStatus === 1" trigger="hover" :teleported="false">
                <el-button type="success" round plain>
                  <el-icon style="margin-right: 5px"><Check /></el-icon>
                  已是好友
                  <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="$router.push('/message/' + userInfo.id)">私信</el-dropdown-item>
                    <el-dropdown-item @click="handleUnfriend">解除好友</el-dropdown-item>
                    <el-dropdown-item divided @click="handleBlock" style="color: red">拉黑</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
             </el-dropdown>

             <el-button v-if="friendStatus === 2" type="info" round plain disabled>已发送申请</el-button>
             <el-button v-if="friendStatus === 3" type="warning" round @click="showRequestsVisible = true">处理好友请求</el-button>
             <el-button v-if="friendStatus === -2" type="danger" round plain disabled>已拉黑</el-button>
             <el-button v-if="friendStatus === 4" type="info" round plain disabled>对方拒收</el-button>
             
             <!-- Private Message Button -->
             <div style="margin-left: 10px; display: inline-block;" v-if="userInfo.id !== currentUser.id">
                 <el-button circle @click="$router.push('/message/' + userInfo.id)">
                    <el-icon><Message /></el-icon>
                 </el-button>
             </div>
             </template>

             <!-- Owner Actions: Friend Requests -->
             <el-button v-if="userInfo.id === currentUser.id" type="primary" round plain @click="showRequestsVisible = true">
                <el-icon style="margin-right: 5px"><Bell /></el-icon>
                好友请求
                <el-badge v-if="friendRequests.length > 0" :value="friendRequests.length" class="item" type="danger" style="margin-left: 5px; vertical-align: middle;" />
             </el-button>
        </div>
      </div>
        <p class="bio">{{ userInfo.bio || '这个人很懒，什么都没写~' }}</p>
        <div class="join-date">
           加入时间: {{ formatTime(userInfo.createTime) }}
        </div>
      </div>

    </div>

    <div class="stats-panel">
      <div class="stats-grid">
        <div class="stat-box pink">
          <div class="num">{{ stats.total || 0 }}</div>
          <div class="label">收藏</div>
        </div>
        <div class="stat-box green">
          <div class="num">{{ stats.completed || 0 }}</div>
          <div class="label">完成</div>
        </div>
        <div class="stat-box blue">
          <div class="num">{{ formatRate(stats.completionRate) }}%</div>
          <div class="label">完成率</div>
        </div>
        <div class="stat-box orange">
          <div class="num">{{ stats.avgScore || '0.00' }}</div>
          <div class="label">平均分</div>
        </div>
        <div class="stat-box purple">
          <div class="num">{{ stats.stdDev || '0.00' }}</div>
          <div class="label">标准差</div>
        </div>
        <div class="stat-box cyan">
          <div class="num">{{ stats.ratedCount || 0 }}</div>
          <div class="label">评分数</div>
        </div>
      </div>
      <div class="chart-box" ref="chartRef"></div>
    </div>

    <el-tabs v-model="activeTab" class="collection-tabs" type="border-card">
      <el-tab-pane label="在看" name="3"><AnimeList :list="filterList(3)" /></el-tab-pane>
      <el-tab-pane label="看过" name="2"><AnimeList :list="filterList(2)" /></el-tab-pane>
      <el-tab-pane label="想看" name="1"><AnimeList :list="filterList(1)" /></el-tab-pane>
      <el-tab-pane label="搁置" name="4"><AnimeList :list="filterList(4)" /></el-tab-pane>
      <el-tab-pane label="抛弃" name="5"><AnimeList :list="filterList(5)" /></el-tab-pane>
      
      <el-tab-pane label="我的好友" name="friends" v-if="userInfo.id === currentUser.id">
         <div class="friend-list">
             <div v-for="f in friendList" :key="f.id" class="friend-item">
                <div @click="$router.push('/user/' + f.id)" class="friend-info">
                    <el-avatar :src="f.avatar || defaultAvatar" size="50"></el-avatar>
                    <div class="friend-name">{{ f.nickname }}</div>
                </div>
                <!-- Dropdown for actions -->
                <el-dropdown trigger="hover" class="friend-actions-menu" :teleported="false">
                    <span class="el-dropdown-link">
                        <el-icon><More /></el-icon>
                    </span>
                    <template #dropdown>
                        <el-dropdown-menu>
                           <el-dropdown-item @click="$router.push('/message/' + f.id)">私信</el-dropdown-item>
                           <el-dropdown-item @click="deleteFriend(f.id).then(() => { loadFriendList(); loadStats(currentUser.id); })">解除好友</el-dropdown-item>
                           <el-dropdown-item divided @click="blockUser(f.id).then(() => { loadFriendList(); loadStats(currentUser.id); })" style="color: red">拉黑</el-dropdown-item>
                        </el-dropdown-menu>
                    </template>
                </el-dropdown>
             </div>
             <el-empty v-if="friendList.length === 0" description="暂无好友"></el-empty>
         </div>
     </el-tab-pane>
      
      <el-tab-pane label="黑名单" name="blacklist" v-if="userInfo.id === currentUser.id">
         <div class="friend-list">
             <div v-for="b in blockedList" :key="b.id" class="friend-item">
                <div class="friend-info">
                    <el-avatar :src="b.avatar || defaultAvatar" size="50"></el-avatar>
                    <div class="friend-name">{{ b.nickname }}</div>
                </div>
                <el-button type="primary" size="small" @click="unblockUser(b.id).then(() => { loadFriendList(); })">解除拉黑</el-button>
             </div>
             <el-empty v-if="blockedList.length === 0" description="暂无拉黑用户"></el-empty>
         </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="editVisible" title="编辑个人资料" width="450px">
      <el-form :model="editForm" label-width="60px">
        <el-form-item label="昵称">
          <el-input v-model="editForm.nickname" />
        </el-form-item>
        
        <el-form-item label="头像" class="avatar-item">
          <div class="avatar-controls">
            <el-upload
              class="avatar-uploader"
              action="/api/file/upload"
              :show-file-list="false"
              :on-success="handleAvatarSuccess"
            >
              <img v-if="editForm.avatar" :src="editForm.avatar" class="avatar" />
              <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
            </el-upload>

            <div class="url-input-box">
              <el-input 
                v-model="editForm.avatar" 
                placeholder="可以直接粘贴网络图片链接" 
                clearable
              />
              <el-button type="info" link size="small" @click="editForm.avatar = ''" style="margin-top: 5px;">
                恢复默认头像
              </el-button>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="editForm.bio" type="textarea" :rows="3" placeholder="写一句话介绍自己..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="saveProfile">保存</el-button>
      </template>
    </el-dialog>

    <!-- Friend Requests Dialog -->
    <el-dialog v-model="showRequestsVisible" title="好友请求" width="500px">
       <div class="request-list">
          <div v-for="req in friendRequests" :key="req.request.id" class="request-item">
             <div class="req-user">
               <el-avatar :src="req.sender.avatar || defaultAvatar" size="40"></el-avatar>
               <span class="req-name">{{ req.sender.nickname }}</span>
             </div>
             <div class="req-actions">
               <el-button type="success" size="small" @click="handleRequest(req.request, 1)">接受</el-button>
               <el-button type="danger" size="small" @click="handleRequest(req.request, 2)">拒绝</el-button>
               <el-button type="info" size="small" @click="handleRequest(req.request, 3)">忽略</el-button>
             </div>
          </div>
          <el-empty v-if="friendRequests.length === 0" description="暂无好友请求"></el-empty>
       </div>
    </el-dialog>



  </div>
</template>

<script setup>
import { useProfileLogic } from './js/ProfileLogic.js'
import { Edit, Plus, More, Check, ArrowDown, Bell, Message } from '@element-plus/icons-vue' 
import AnimeList from '../components/AnimeList.vue'

const {
  userInfo, stats, allCollections, activeTab, defaultAvatar,
  editVisible, editForm, chartRef, currentUser,
  friendStatus, friendRequests, friendList, showRequestsVisible,
  handleAvatarSuccess, loadStats, loadCollection, filterList,
  openEdit, saveProfile, formatTime, formatRate,
  sendFriendRequest, handleRequest, loadFriendRequests,
  deleteFriend, blockUser, blockedList, unblockUser, handleBlock, handleHeaderUnblock, handleUnfriend
} = useProfileLogic()
</script>

<style scoped>
@import './css/Profile.css';
</style>