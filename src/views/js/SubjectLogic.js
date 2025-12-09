import { ref, onMounted, computed, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { ElMessage } from 'element-plus'

export function useSubjectLogic() {
  const route = useRoute()
  const router = useRouter()

  // === 变量定义 ===
  const anime = ref(null)
  const dynamicInfoBox = ref([])
  const dialogVisible = ref(false)
  const infoDialogVisible = ref(false)
  const charDialogVisible = ref(false)
  const staffDialogVisible = ref(false)

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
  const currentStatus = ref(null)
  const comments = ref([])
  const commentContent = ref('')

  const staff = ref([])
  const cast = ref([])
  const episodes = ref([])

  const INFO_DISPLAY_LIMIT = 5
  const CHAR_DISPLAY_LIMIT = 10
  const STAFF_DISPLAY_LIMIT = 6

  const statusForm = reactive({
    userId: currentUser.id,
    animeId: '',
    status: 1,
    score: 0,
    comment: '',
    progress: 0
  })

  // === 辅助工具 ===
  const isMainCharacter = (name, role) => {
    if (!name) return false
    const blockList = [
      '旁白', 'announce', 'narrator', 'ナレーション', 'ナレーター',
      '路人', '群众', '广播', 'アナウンス', 'モブ', '剧切', 'System', '系统'
    ]
    const n = name.toLowerCase()
    const r = (role || '').toLowerCase()
    if (blockList.some(w => n.includes(w.toLowerCase()))) return false
    if (blockList.some(w => r.includes(w.toLowerCase()))) return false
    if (r === '客串') return false
    return true
  }

  // 排序函数
  const sortCharacters = (list) => {
    return list.sort((a, b) => {
      const roleA = a.role || a.relation || ''
      const roleB = b.role || b.relation || ''
      if (roleA === '主角' && roleB !== '主角') return -1
      if (roleA !== '主角' && roleB === '主角') return 1
      if (roleA === '配角' && roleB !== '配角') return -1
      if (roleA !== '配角' && roleB === '配角') return 1
      return 0
    })
  }

  // === 计算属性 ===
  const infoBoxList = computed(() => {
    if (dynamicInfoBox.value.length > 0) return dynamicInfoBox.value
    if (anime.value && anime.value.infoBox) {
      try { return JSON.parse(anime.value.infoBox) } catch (e) { return [] }
    }
    return []
  })

  const visibleInfoBox = computed(() => {
    return infoBoxList.value.slice(0, INFO_DISPLAY_LIMIT)
  })

  const visibleCast = computed(() => {
    return cast.value
      .filter(c => isMainCharacter(c.name, c.role))
      .slice(0, CHAR_DISPLAY_LIMIT)
  })

  const visibleStaff = computed(() => {
    return staff.value.slice(0, STAFF_DISPLAY_LIMIT)
  })

  const groupedStaff = computed(() => {
    const groups = []
    const map = new Map()
    staff.value.forEach(p => {
      if (!map.has(p.relation)) {
        const newGroup = { role: p.relation, persons: [] }
        map.set(p.relation, newGroup)
        groups.push(newGroup)
      }
      map.get(p.relation).persons.push(p)
    })
    return groups
  })

  const tagsArray = computed(() => {
    if (anime.value && anime.value.tags) return anime.value.tags.split(',')
    return []
  })

  const getStatusText = (code) => {
    const map = { 1: '想看', 2: '看过', 3: '在看', 4: '搁置', 5: '抛弃' }
    return map[code] || '未知'
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    try {
      const date = new Date(timeStr)
      return new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Singapore',
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
      }).format(date)
    } catch (e) { return timeStr }
  }

  const toggleInfoExpand = () => {
    infoDialogVisible.value = true
  }

  // === 核心业务逻辑 ===

  const loadDetail = (id) => {
    axios.get('/api/anime/' + id).then(res => {
      if (res.data.code === '200') {
        const data = res.data.data
        anime.value = data

        // 本地 JSON 解析
        if (data.characterJson) {
          try {
            const rawChars = JSON.parse(data.characterJson)
            const mappedChars = rawChars.map(c => ({
              id: c.name, name: c.name, role: c.role,
              images: { grid: c.image }, actors: [{ name: c.cv }]
            }))
            cast.value = sortCharacters(mappedChars)
          } catch (e) { }
        }

        if (data.staffJson) {
          try {
            const s = JSON.parse(data.staffJson)
            staff.value = s.map(p => ({ id: p.name, name: p.name, relation: p.role }))
          } catch (e) { }
        }

        if (data.episodesJson) {
          try { episodes.value = JSON.parse(data.episodesJson) } catch (e) { }
        }

        // API 回退
        if (anime.value.bgmId && cast.value.length === 0) {
          fetchBangumiAll(anime.value.bgmId)
        }
      } else {
        ElMessage.error(res.data.msg)
      }
    }).catch(err => {
      console.error(err)
      ElMessage.error('番剧详情加载失败，请检查后端是否启动')
    })
  }

  const fetchBangumiAll = (bgmId) => {
    axios.get(`/bgm-api/v0/subjects/${bgmId}/characters`).then(res => {
      if (Array.isArray(res.data)) cast.value = sortCharacters(res.data)
    })

    axios.get(`/bgm-api/v0/subjects/${bgmId}/persons`).then(res => {
      if (Array.isArray(res.data)) {
        const rolePriority = {
          '动画制作': 1, '原作': 2, '导演': 3, '系列构成': 4, '人物设定': 5,
          '作画监督': 6, '脚本': 7, '分镜': 8, '演出': 9, '制片人': 10
        }
        // 移除去重，保留全部
        staff.value = res.data
          .filter(p => rolePriority[p.relation])
          .sort((a, b) => (rolePriority[a.relation] || 99) - (rolePriority[b.relation] || 99))
      }
    })

    axios.get(`/bgm-api/v0/episodes`, { params: { subject_id: bgmId, type: 0, limit: 100 } }).then(res => {
      if (res.data && Array.isArray(res.data.data)) {
        episodes.value = res.data.data.filter(ep => ep.type === 0).sort((a, b) => a.sort - b.sort)
      }
    })

    axios.get(`/bgm-api/v0/subjects/${bgmId}`).then(res => {
      const data = res.data
      if (data.summary) anime.value.summary = data.summary
      if (data.rating && data.rating.score) anime.value.rating = data.rating.score
      if (data.images && data.images.large) anime.value.coverUrl = data.images.large
      if (data.tags && Array.isArray(data.tags)) {
        anime.value.tags = data.tags.slice(0, 6).map(t => t.name).join(',')
      }
      if (data.infobox && Array.isArray(data.infobox)) {
        dynamicInfoBox.value = data.infobox.map(item => {
          if (typeof item.value === 'string') return item
          if (Array.isArray(item.value)) return { key: item.key, value: item.value.map(v => v.v).join(' / ') }
          return null
        }).filter(i => i)
      }
    })
  }

  const checkStatus = (animeId) => {
    if (!currentUser.id) return;
    axios.get(`/api/collection/status?userId=${currentUser.id}&animeId=${animeId}`)
      .then(res => {
        if (res.data.code === '200' && res.data.data) {
          const d = res.data.data
          currentStatus.value = d
          statusForm.status = d.status
          statusForm.score = d.score
          statusForm.comment = d.comment
          statusForm.progress = d.progress || 0
        }
      })
  }

  const loadComments = (animeId) => {
    const myId = currentUser.id ? currentUser.id : ''
    axios.get(`/api/post/list/${animeId}?viewerId=${myId}`).then(res => {
      if (res.data.code === '200') comments.value = res.data.data
    })
  }

  // 👇👇👇 修改：智能更新进度和状态 👇👇👇
  const updateEpStatus = (epSort) => {
    if (!currentUser.id) return ElMessage.warning('请先登录')

    // 获取当前状态，如果没有则默认为"在看"(3)
    let targetStatus = currentStatus.value ? currentStatus.value.status : 3
    const total = anime.value?.totalEpisodes || 0

    // === 智能判断逻辑 ===
    if (total > 0) {
      if (epSort >= total) {
        // 如果进度到了总集数 -> 自动变成"看过"
        targetStatus = 2
      } else if (targetStatus === 2 && epSort < total) {
        // 如果本来是"看过"，但现在进度变小了 -> 自动变回"在看"
        targetStatus = 3
      }
    }

    const payload = {
      userId: currentUser.id,
      animeId: route.params.id,
      status: targetStatus, // 使用计算后的新状态
      progress: epSort
    }

    axios.post('/api/collection/update', payload).then(res => {
      if (res.data.code === '200') {
        ElMessage.success(`进度更新: 第 ${epSort} 话`)
        checkStatus(route.params.id)
      } else {
        ElMessage.error(res.data.msg)
      }
    })
  }
  const openDialog = () => {
    if (!currentUser.id) {
      ElMessage.warning('请先登录！')
      router.push('/login')
      return
    }
    dialogVisible.value = true
  }

  const submitStatus = () => {
    axios.post('/api/collection/update', statusForm).then(res => {
      if (res.data.code === '200') {
        ElMessage.success('保存成功')
        dialogVisible.value = false
        checkStatus(statusForm.animeId)
      } else {
        ElMessage.error(res.data.msg)
      }
    })
  }

  const submitComment = () => {
    if (!currentUser.id) return ElMessage.warning('请先登录')
    if (!commentContent.value.trim()) return ElMessage.warning('写点内容')
    const postData = { userId: currentUser.id, animeId: route.params.id, content: commentContent.value }
    axios.post('/api/post/add', postData).then(res => {
      if (res.data.code === '200') {
        ElMessage.success('发送成功')
        commentContent.value = ''
        loadComments(route.params.id)
      } else {
        ElMessage.error(res.data.msg)
      }
    })
  }

  const goEpisode = (epId) => {
    router.push(`/play/${route.params.id}/${epId}`)
  }

  onMounted(() => {
    const id = route.params.id
    statusForm.animeId = id
    loadDetail(id)
    checkStatus(id)
    loadComments(id)
  })

  return {
    router, anime, tagsArray, dialogVisible, currentStatus, statusForm, comments, commentContent,
    staff, cast, episodes,
    infoBoxList, visibleInfoBox, infoDialogVisible,
    charDialogVisible, visibleCast,
    staffDialogVisible, visibleStaff,
    groupedStaff, currentUser,
    getStatusText, formatTime, openDialog, submitStatus, submitComment, toggleInfoExpand,
    goEpisode, updateEpStatus
  }
}