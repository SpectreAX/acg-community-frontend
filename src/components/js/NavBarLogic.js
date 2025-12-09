import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

export function useNavBarLogic() {
  const router = useRouter()
  const route = useRoute()
  const user = ref({})
  const keyword = ref('')
  
  // 滚动相关
  const isVisible = ref(true)
  const lastScrollTop = ref(0)
  const isTransparent = ref(true) // 在顶部时透明(可选)，或者一直白底

  const checkUser = () => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      user.value = JSON.parse(userStr)
    } else {
      user.value = {}
    }
  }

  const handleScroll = () => {
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop
    
    // 1. 控制显示/隐藏
    if (currentScroll > lastScrollTop.value && currentScroll > 60) {
      // 向下滚动且不在顶部 -> 隐藏
      isVisible.value = false
    } else {
      // 向上滚动 -> 显示
      isVisible.value = true
    }
    lastScrollTop.value = currentScroll <= 0 ? 0 : currentScroll
    
    // 2. 控制背景阴影 (在顶部时没阴影)
    isTransparent.value = currentScroll < 10
  }

  const handleSearch = () => {
    // 跳转到首页并带上查询参数
    router.push({ name: 'Home', query: { keyword: keyword.value } })
  }
  
  const logout = () => {
    localStorage.removeItem('user')
    location.reload()
  }

  onMounted(() => {
    checkUser()
    window.addEventListener('scroll', handleScroll)
    // 如果 URL 里有 keyword，回填到搜索框
    if (route.query.keyword) keyword.value = route.query.keyword
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
  })

  // 监听路由变化，自动更新用户信息（比如登录后跳转回来）
  watch(() => route.path, () => {
    checkUser()
  })

  return {
    user, keyword, isVisible, isTransparent,
    router, handleSearch, logout
  }
}