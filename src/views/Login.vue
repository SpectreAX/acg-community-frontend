<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <div class="card-header">
          <h2 class="title">{{ isRegister ? 'ACG 社区 - 注册' : 'ACG 社区 - 登录' }}</h2>
          
          <el-button link type="primary" @click="router.push('/')">
            返回主页 <el-icon class="el-icon--right"><ArrowRight /></el-icon>
          </el-button>
        </div>
      </template>

      <el-form :model="form" label-position="top" size="large">
        
        <el-form-item label="用户名">
          <el-input v-model="form.username" placeholder="请输入用户名" :prefix-icon="User" />
        </el-form-item>

        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" :prefix-icon="Lock" show-password />
        </el-form-item>

        <el-form-item label="昵称" v-if="isRegister">
          <el-input v-model="form.nickname" placeholder="给自己起个好听的名字" :prefix-icon="Edit" />
        </el-form-item>

        <!-- Cloudflare Turnstile - 登录和注册都显示 -->
        <el-form-item>
          <div id="turnstile-container"></div>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" class="w-100" @click="handleSubmit">
            {{ isRegister ? '立即注册' : '登录' }}
          </el-button>
        </el-form-item>

        <div class="toggle-box">
          <span v-if="!isRegister">
            还没有账号？ <el-link type="primary" @click="isRegister = true">去注册</el-link>
          </span>
          <span v-else>
            已有账号？ <el-link type="primary" @click="isRegister = false">去登录</el-link>
          </span>
        </div>

      </el-form>
    </el-card>
  </div>
</template>

<script setup>
// 1. 引入 Logic
import { useLoginLogic } from './js/LoginLogic.js'
// 2. 引入图标 (模板中用到)
import { User, Lock, Edit, ArrowRight } from '@element-plus/icons-vue' 

const { router, isRegister, form, handleSubmit } = useLoginLogic()
</script>

<style scoped>
/* 3. 引入 CSS */
@import './css/Login.css';
</style>