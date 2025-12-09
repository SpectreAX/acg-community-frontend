<template>
  <div 
    class="navbar-wrapper" 
    :class="{ 'navbar-hidden': !isVisible, 'navbar-shadow': !isTransparent }"
  >
    <div class="navbar-content">
      <div class="logo" @click="router.push('/')">ACG Community</div>

      <div class="center-search">
        <el-input 
          v-model="keyword" 
          placeholder="搜索番剧..." 
          clearable
          @keyup.enter="handleSearch"
        >
          <template #append>
            <el-button @click="handleSearch">搜索</el-button>
          </template>
        </el-input>
      </div>

      <div class="right-actions">
        <el-button link class="nav-btn" @click="router.push('/anime/all')">番剧索引</el-button>
        <el-button link class="nav-btn" @click="router.push('/discussion')">讨论区</el-button>

        <template v-if="user.id">
          <el-button link class="nav-btn" @click="router.push('/message')">私信</el-button>

          
          <el-dropdown v-if="user.role === 0">
            <el-button type="success" link class="nav-btn">管理菜单</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="router.push('/admin/add')">发布新番</el-dropdown-item>
                <el-dropdown-item @click="router.push('/admin/manage')">后台管理</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <el-avatar 
            :size="40" 
            :src="user.avatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" 
            style="cursor: pointer; margin-left: 10px;"
            @click="router.push('/profile')"
          />
          <el-button type="danger" link @click="logout">退出</el-button>
        </template>

        <template v-else>
          <el-button type="primary" @click="router.push('/login')">登录 / 注册</el-button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useNavBarLogic } from './js/NavBarLogic.js'
const { user, keyword, isVisible, isTransparent, router, handleSearch, logout } = useNavBarLogic()
</script>

<style scoped>
@import './css/NavBar.css';
</style>