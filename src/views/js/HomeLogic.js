import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

export function useHomeLogic() {
  const router = useRouter()
  const keyword = ref('')
  const user = ref({})

  // 数据源
  const allAnimes = ref([])    // 所有的番剧数据
  const displayList = ref([])  // 当前展示在页面上的数据
  const myWatchingList = ref([])

  // 分页配置
  const PAGE_SIZE = 15
  const currentPage = ref(1)
  const loadingMore = ref(false)

  // 计算属性：是否还有更多数据
  const hasMore = computed(() => {
    return displayList.value.length < allAnimes.value.length
  })

  // 加载所有番剧
  const loadAnimes = () => {
    let url = '/api/anime/list'
    if (keyword.value) {
      url = `/api/anime/search?keyword=${keyword.value}`
    }

    axios.get(url).then(res => {
      if (res.data.code === '200') {
        allAnimes.value = res.data.data
        // 初始化：重置分页，只取第一页数据
        currentPage.value = 1
        displayList.value = allAnimes.value.slice(0, PAGE_SIZE)
      }
    })
  }

  // 加载更多逻辑
  const loadMore = () => {
    loadingMore.value = true
    // 模拟一点网络延迟
    setTimeout(() => {
      currentPage.value++
      const end = currentPage.value * PAGE_SIZE
      // 截取 0 到 当前页*页大小 的数据
      displayList.value = allAnimes.value.slice(0, end)
      loadingMore.value = false
    }, 300)
  }

  // 标签颜色逻辑
  const getPlatformType = (platform) => {
    if (!platform) return 'info'
    if (platform.includes('剧场版') || platform === 'Movie') return 'warning'
    if (platform.includes('WEB')) return 'success'
    if (platform.includes('OVA')) return 'danger'
    return 'primary'
  }

  // 加载“我的追番”
  const loadMyWatching = () => {
    axios.get('/api/collection/list?userId=' + user.value.id).then(res => {
      if (res.data.code === '200') {
        myWatchingList.value = res.data.data.filter(item => item.status.status === 3)
      }
    })
  }

  // 状态切换
  const handleStatusChange = (newStatus, item) => {
    const payload = { ...item.status, status: parseInt(newStatus) }
    axios.post('/api/collection/update', payload).then(res => {
      if (res.data.code === '200') {
        ElMessage.success('状态更新成功')
        loadMyWatching()
      }
    })
  }

  // 进度+1
  const updateProgress = (item) => {
    const current = item.status.progress || 0
    const total = item.anime.totalEpisodes || 999
    if (current >= total) return
    const newStatus = { ...item.status, progress: current + 1 }
    axios.post('/api/collection/update', newStatus).then(res => {
      if (res.data.code === '200') {
        ElMessage.success(`${item.anime.title} 进度 +1`)
        item.status.progress += 1
      }
    })
  }

  const calculatePercentage = (current, total) => {
    if (!current || !total) return 0
    return Math.floor((current / total) * 100)
  }

  const handleSearch = () => { loadAnimes() }
  const goDetail = (id) => { router.push('/subject/' + id) }
  const logout = () => {
    localStorage.removeItem('user')
    location.reload()
  }

  onMounted(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      user.value = JSON.parse(userStr)
      loadMyWatching()
    }
    // 👇 初始化 keyword
    if (router.currentRoute.value.query.keyword) {
      keyword.value = router.currentRoute.value.query.keyword
    }
    loadAnimes()
  })

  // 👇 监听路由 query 变化 (搜索逻辑)
  watch(() => router.currentRoute.value.query.keyword, (newVal) => {
    keyword.value = newVal || ''
    loadAnimes()
  })

  return {
    router, keyword, user,
    allAnimes, displayList, myWatchingList,
    loadingMore, hasMore,
    loadAnimes, loadMore, getPlatformType, loadMyWatching,
    handleStatusChange, updateProgress, calculatePercentage,
    handleSearch, goDetail, logout
  }
}