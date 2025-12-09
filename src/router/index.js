import { createRouter, createWebHistory } from 'vue-router'

// 1. 引入所有组件
import Login from '../views/Login.vue'
import Home from '../views/Home.vue'
import Profile from '../views/Profile.vue'
import Subject from '../views/Subject.vue'
import EpisodeDetail from '../views/EpisodeDetail.vue'
import AdminAdd from '../views/AdminAdd.vue'
import AdminManage from '../views/AdminManage.vue'
import Discussion from '../views/Discussion.vue'
import ArticlePublish from '../views/ArticlePublish.vue'
import AllAnime from '../views/AllAnime.vue'
import Journal from '../views/Journal.vue'
import Message from '../views/Message.vue'

const routes = [
  // 首页
  { path: '/', name: 'Home', component: Home },

  // 登录页
  { path: '/login', name: 'Login', component: Login },

  // 个人中心 (查看自己)
  { path: '/profile', name: 'Profile', component: Profile },
  // 查看他人主页
  { path: '/user/:id', name: 'UserProfile', component: Profile },

  // 私信页面
  { path: '/message', name: 'MessageList', component: Message },
  { path: '/message/:userId', name: 'Message', component: Message },

  // 讨论区
  { path: '/discussion', name: 'Discussion', component: Discussion },
  { path: '/article/publish', name: 'ArticlePublish', component: ArticlePublish },

  // 全部番剧 (新增)
  { path: '/anime/all', name: 'AllAnime', component: AllAnime },

  // 日志广场
  { path: '/journal', name: 'Journal', component: Journal },

  // 番剧详情
  { path: '/subject/:id', name: 'Subject', component: Subject },

  // 单集详情 (播放页)
  { path: '/play/:subjectId/:episodeId', name: 'EpisodeDetail', component: EpisodeDetail },

  // 后台管理
  { path: '/admin/manage', name: 'AdminManage', component: AdminManage },
  { path: '/admin/add', name: 'AdminAdd', component: AdminAdd },
  { path: '/admin/edit/:id', name: 'AdminEdit', component: AdminAdd },
  { path: '/admin/video/:id', name: 'AdminEpisodeVideo', component: () => import('../views/AdminEpisodeVideo.vue') }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

export default router