<template>
  <NavBar />
  <div class="main-layout">
    <router-view v-slot="{ Component }">
      <keep-alive include="AllAnime,Discussion">
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </div>
  <!-- DeepSeek AI 聊天助手 -->
  <ChatBot />
</template>

<script setup>
import NavBar from './components/NavBar.vue'
import ChatBot from './components/ChatBot.vue'
</script>

<style>
/* 全局样式 */
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  overflow-x: hidden; /* 👇 防止横向滚动条 */
  background-color: #ffffff;
}
.main-layout {
  padding-top: 64px; /* 👇 刚好等于导航栏高度 */
  min-height: 100vh;
}
</style>