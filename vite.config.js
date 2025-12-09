import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  define: {
    global: 'window'
  },
  server: {
    port: 5173,
    proxy: {
      // 1. 本地后端代理
      '/api': {
        target: 'http://localhost:9090',
        changeOrigin: true
      },
      // 👇👇👇 2. Bangumi API 代理 (重点检查这里！) 👇👇👇
      '/bgm-api': {
        target: 'https://api.bgm.tv', // 目标地址
        changeOrigin: true, // 必须开启跨域
        rewrite: (path) => path.replace(/^\/bgm-api/, '') // 必须去掉前缀
      }
    }
  }
})