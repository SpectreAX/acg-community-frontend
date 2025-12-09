<template>
  <div class="admin-background">
    <div class="admin-container">
      <div class="header">
        <h2>后台管理中心</h2>
        <el-button @click="$router.push('/')">返回首页</el-button>
      </div>

      <el-tabs type="border-card">
        
        <el-tab-pane label="番剧管理">
          <div class="action-bar">
            <el-button type="success" :icon="Plus" @click="$router.push('/admin/add')">发布新番</el-button>
            
            <el-divider direction="vertical" />
            
            <el-button type="primary" plain :disabled="multipleSelection.length === 0" @click="updateSelected">
              更新选中 ({{ multipleSelection.length }})
            </el-button>
            <el-button type="warning" plain @click="updateAll">
              更新全部
            </el-button>
            <el-button type="danger" plain :disabled="multipleSelection.length === 0" @click="deleteSelected" style="margin-left: 10px;">
              批量删除
            </el-button>
          </div>
          
          <el-table 
            :data="animeList" 
            stripe 
            style="width: 100%" 
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="55" />
            
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column label="封面" width="80">
              <template #default="scope">
                <el-image 
                  :src="scope.row.coverUrl" 
                  class="clickable-cover"
                  style="width: 45px; height: 60px; border-radius: 4px;"
                  fit="cover" 
                  @click="goToSubject(scope.row.id)"
                />
              </template>
            </el-table-column>
            <el-table-column label="标题" min-width="200" show-overflow-tooltip>
              <template #default="scope">
                <span class="clickable-title" @click="goToSubject(scope.row.id)">
                  {{ scope.row.title }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="bgmId" label="BgmID" width="80" />
            <el-table-column prop="rating" label="评分" width="70" sortable />
            
            <el-table-column label="操作" width="320" fixed="right">
              <template #default="scope">
                <div style="display: flex; gap: 8px; align-items: center;">
                  <el-button size="small" type="success" plain @click="updateSingle(scope.row)">更新</el-button>
                  
                  <el-button size="small" type="warning" plain @click="$router.push('/admin/video/' + scope.row.id)">视频源</el-button>

                  <el-button size="small" type="primary" @click="editAnime(scope.row.id)">编辑</el-button>
                  
                  <el-popconfirm title="确定删除?" @confirm="deleteAnime(scope.row.id)">
                    <template #reference>
                      <el-button size="small" type="danger">删除</el-button>
                    </template>
                  </el-popconfirm>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="用户管理">
          <div style="margin-bottom: 15px;">
             <el-button type="success" :icon="Plus" @click="openUserAdd">添加用户</el-button>
          </div>
          <el-table :data="userList" stripe style="width: 100%">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="username" label="用户名" width="120" />
            <el-table-column prop="nickname" label="昵称" width="120" />
            <el-table-column prop="role" label="角色">
              <template #default="scope">
                <el-tag :type="scope.row.role === 0 ? 'danger' : 'info'">
                  {{ scope.row.role === 0 ? '管理员' : '普通用户' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="注册时间" width="180">
              <template #default="scope">{{ formatTime(scope.row.createTime) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="200">
              <template #default="scope">
                <el-button size="small" type="primary" @click="openUserEdit(scope.row)">编辑</el-button>
                <el-popconfirm title="确定注销?" @confirm="deleteUser(scope.row.id)">
                  <template #reference>
                    <el-button size="small" type="danger" :disabled="scope.row.id === currentUser.id">删除</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="评论审核">
          <el-table :data="postList" stripe style="width: 100%">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="content" label="内容" show-overflow-tooltip />
            <el-table-column prop="animeId" label="番剧ID" width="80" />
            <el-table-column prop="nickname" label="发布人" width="120" />
            <el-table-column label="时间" width="180">
              <template #default="scope">{{ formatTime(scope.row.createTime) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="scope">
                <el-popconfirm title="确定删除?" @confirm="deletePost(scope.row.id)">
                  <template #reference>
                    <el-button size="small" type="danger">删除</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

      </el-tabs>

      <el-dialog v-model="editDialogVisible" title="修改用户信息" width="400px">
        <el-form :model="editForm" label-width="80px">
          <el-form-item label="用户名"><el-input v-model="editForm.username" disabled /></el-form-item>
          <el-form-item label="昵称"><el-input v-model="editForm.nickname" /></el-form-item>
          <el-form-item label="角色">
            <el-radio-group v-model="editForm.role">
              <el-radio :label="1">普通</el-radio>
              <el-radio :label="0">管理员</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitUserEdit">保存</el-button>
        </template>
      </el-dialog>

      <!-- 新增用户 Dialog -->
      <el-dialog v-model="addUserDialogVisible" title="添加新用户" width="400px">
        <el-form :model="addUserForm" label-width="80px">
          <el-form-item label="用户名">
             <el-input v-model="addUserForm.username" placeholder="请输入用户名" />
          </el-form-item>
          <el-form-item label="密码">
             <el-input v-model="addUserForm.password" type="password" show-password placeholder="请输入密码" />
          </el-form-item>
          <el-form-item label="昵称">
             <el-input v-model="addUserForm.nickname" placeholder="请输入昵称" />
          </el-form-item>
          <el-form-item label="角色">
            <el-radio-group v-model="addUserForm.role">
              <el-radio :label="1">普通用户</el-radio>
              <el-radio :label="0">管理员</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="addUserDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitUserAdd">立即创建</el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup>
import { useAdminManageLogic } from './js/AdminManageLogic.js'
import { Plus } from '@element-plus/icons-vue'

const {
  router, currentUser,
  userList, postList, animeList,
  editDialogVisible, editForm, multipleSelection,
  formatTime, openUserEdit, submitUserEdit,
  editAnime, deleteAnime, deleteUser, deletePost,
  handleSelectionChange, updateSelected, updateAll, updateSingle, deleteSelected,
  goToSubject,
  addUserDialogVisible, addUserForm, openUserAdd, submitUserAdd
} = useAdminManageLogic()
</script>

<style scoped>
@import './css/AdminManage.css';

.clickable-cover {
  cursor: pointer;
  transition: transform 0.2s;
}

.clickable-cover:hover {
  transform: scale(1.05);
}

.clickable-title {
  cursor: pointer;
  color: #333;
  transition: color 0.2s;
}

.clickable-title:hover {
  color: #409EFF;
  text-decoration: underline;
}
</style>