import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { ElMessage } from 'element-plus'

export function useEpisodeDetailLogic() {
  const route = useRoute()
  const router = useRouter()

  const localSubjectId = route.params.subjectId
  const currentEpId = ref(route.params.episodeId)

  const episodeList = ref([])
  const loading = ref(false)

  const currentEp = computed(() => {
    if (episodeList.value.length === 0) return null
    return episodeList.value.find(e => e.id == currentEpId.value)
  })

  const comments = ref([])
  const commentContent = ref('')
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')

  // 初始化
  const initPageData = () => {
    loading.value = true
    axios.get(`/api/anime/${localSubjectId}`).then(res => {
      if (res.data.code === '200') {
        const data = res.data.data
        if (data.episodesJson) {
          try {
            const eps = JSON.parse(data.episodesJson)
            if (eps && eps.length > 0) {
              episodeList.value = eps
              currentEpId.value = route.params.episodeId
              loading.value = false

              // 👇 加载该集的评论
              loadComments()
              return
            }
          } catch (e) { }
        }
        if (data.bgmId) {
          fetchEpisodeList(data.bgmId)
        } else {
          loading.value = false
        }
      }
    })
  }

  const fetchEpisodeList = (bgmId) => {
    axios.get(`/bgm-api/v0/episodes`, {
      params: { subject_id: bgmId, type: 0, limit: 100, offset: 0 }
    }).then(res => {
      if (res.data && Array.isArray(res.data.data)) {
        episodeList.value = res.data.data
          .filter(ep => ep.type === 0)
          .sort((a, b) => a.sort - b.sort)

        // 👇 列表加载完后，加载评论
        loadComments()
      }
    }).finally(() => {
      loading.value = false
    })
  }

  const switchEpisode = (epId) => {
    currentEpId.value = epId
    router.replace(`/play/${localSubjectId}/${epId}`)
    // 切换集数时，watch 会监听到并重新加载评论
  }

  const goBackSubject = () => {
    // Check if the previous page is the subject page to avoid history loop
    if (window.history.state && window.history.state.back && window.history.state.back.includes(`/subject/${localSubjectId}`)) {
      router.back()
    } else {
      router.push(`/subject/${localSubjectId}`)
    }
  }

  // 👇👇👇 核心修改：加载当前集数的评论 👇👇👇
  const loadComments = () => {
    // 使用 currentEpId.value (这是 Bangumi 的章节ID)
    if (!currentEpId.value) return

    const myId = currentUser.id ? currentUser.id : ''
    axios.get(`/api/post/list/episode/${currentEpId.value}?viewerId=${myId}`).then(res => {
      if (res.data.code === '200') {
        comments.value = res.data.data
      } else {
        comments.value = [] // 失败或空，清空列表
      }
    })
  }

  // 👇👇👇 核心修改：发送评论带上 episodeId 👇👇👇
  const submitComment = () => {
    if (!currentUser.id) return ElMessage.warning('请先登录')
    if (!commentContent.value.trim()) return ElMessage.warning('写点内容')

    const postData = {
      userId: currentUser.id,
      animeId: localSubjectId,
      episodeId: currentEpId.value, // 👈 关键：带上章节ID
      content: commentContent.value
    }

    axios.post('/api/post/add', postData).then(res => {
      if (res.data.code === '200') {
        ElMessage.success('发送成功')
        commentContent.value = ''
        loadComments() // 刷新当前集评论
      }
    })
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    try {
      const date = new Date(timeStr)
      return new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Singapore',
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      }).format(date)
    } catch (e) { return timeStr }
  }

  // 监听路由参数变化
  watch(() => route.params.episodeId, (newId) => {
    currentEpId.value = newId
    // 👇 切换集数时，立即重新加载评论
    loadComments()
  })

  onMounted(() => {
    initPageData()
    // loadComments() 移到了 initPageData 内部调用，确保有ID后再查
  })

  return {
    router, episodeList, currentEp, currentEpId, loading,
    comments, commentContent,
    switchEpisode, goBackSubject, submitComment, formatTime,
    currentUser // 👈 导出 currentUser
  }
}