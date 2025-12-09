import { reactive, ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useRouter, useRoute } from 'vue-router'

export function useAdminAddLogic() {
  const router = useRouter()
  const route = useRoute()
  const loading = ref(false)

  const isEditMode = computed(() => !!route.params.id)

  const form = reactive({
    id: null,
    title: '',
    coverUrl: '',
    summary: '',
    rating: 0,
    tags: '',
    totalEpisodes: 0,
    bgmId: '',
    platform: 'TV动画',
    infoBox: '',
    characterJson: '',
    staffJson: '',
    episodesJson: ''
  })

  const infoList = ref([{ key: '中文名', value: '' }])
  const charList = ref([])
  const staffList = ref([])
  const epList = ref([])

  onMounted(() => {
    if (isEditMode.value) {
      loadData(route.params.id)
    }
  })

  const handleCoverSuccess = (res) => {
    if (res.code === '200') {
      form.coverUrl = res.data
      ElMessage.success('封面上传成功')
    } else {
      ElMessage.error('上传失败: ' + res.msg)
    }
  }

  // 核心：一键填充逻辑
  const fetchByBgmId = async () => {
    if (!form.bgmId) return ElMessage.warning('请先输入 Bangumi ID')

    loading.value = true
    try {
      // 1. 基础信息
      const res = await axios.get(`/bgm-api/v0/subjects/${form.bgmId}`)
      const data = res.data

      form.title = data.name_cn || data.name
      form.summary = data.summary
      if (data.images) {
        form.coverUrl = data.images.large || data.images.common
      }
      if (data.rating) form.rating = data.rating.score

      if (data.platform) {
        const map = { 'TV': 'TV动画', 'Web': 'WEB动画', 'OVA': 'OVA', 'Movie': '剧场版' }
        form.platform = map[data.platform] || data.platform
      }

      form.totalEpisodes = data.total_episodes || data.eps || 0

      if (data.tags && Array.isArray(data.tags)) {
        form.tags = data.tags.slice(0, 6).map(t => t.name).join(',')
      }

      if (data.infobox && Array.isArray(data.infobox)) {
        const newList = []
        data.infobox.forEach(item => {
          if (typeof item.value === 'string') {
            newList.push({ key: item.key, value: item.value })
          } else if (Array.isArray(item.value)) {
            const valStr = item.value.map(v => v.v).join('/')
            newList.push({ key: item.key, value: valStr })
          }
        })
        infoList.value = newList
      }

      // 2. 获取角色 (保留全部，不去掉客串)
      const charRes = await axios.get(`/bgm-api/v0/subjects/${form.bgmId}/characters`)
      if (Array.isArray(charRes.data)) {
        const blockList = ['旁白', 'announce', 'narrator', 'ナレーション', 'ナレーター', '路人', '群众', '广播', 'アナウンス', 'モブ', '剧切', 'System', '系统']

        const cleanChars = charRes.data
          .filter(c => {
            const name = (c.name || '').toLowerCase()
            const role = c.relation || ''
            if (blockList.some(w => name.includes(w.toLowerCase()))) return false
            return true
          })
          .sort((a, b) => {
            const roleA = a.relation || ''
            const roleB = b.relation || ''
            if (roleA === '主角' && roleB !== '主角') return -1
            if (roleA !== '主角' && roleB === '主角') return 1
            if (roleA === '配角' && roleB !== '配角') return -1
            if (roleA !== '配角' && roleB === '配角') return 1
            return 0
          })

        charList.value = cleanChars.map(c => ({
          name: c.name,
          role: c.relation,
          image: c.images?.grid || '',
          cv: c.actors && c.actors[0] ? c.actors[0].name : ''
        }))
      }

      // 3. 获取Staff (保留全部)
      const staffRes = await axios.get(`/bgm-api/v0/subjects/${form.bgmId}/persons`)
      if (Array.isArray(staffRes.data)) {
        const rolePriority = {
          '动画制作': 1, '原作': 2, '导演': 3, '系列构成': 4, '人物设定': 5,
          '作画监督': 6, '脚本': 7, '分镜': 8, '演出': 9, '制片人': 10
        }

        staffList.value = staffRes.data
          .sort((a, b) => {
            const scoreA = rolePriority[a.relation] || 999
            const scoreB = rolePriority[b.relation] || 999
            return scoreA - scoreB
          })
          .map(p => ({
            name: p.name,
            role: p.relation
          }))
      }

      // 4. 获取章节
      try {
        const epRes = await axios.get('/bgm-api/v0/episodes', {
          params: { subject_id: form.bgmId, type: 0, limit: 100 }
        })
        if (epRes.data && Array.isArray(epRes.data.data)) {
          form.totalEpisodes = epRes.data.total
          epList.value = epRes.data.data
            .filter(ep => ep.type === 0)
            .map(ep => ({
              id: ep.id,
              sort: ep.sort,
              name: ep.name_cn || ep.name,
              desc: ep.desc,
              airdate: ep.airdate
            })).sort((a, b) => a.sort - b.sort)
        }
      } catch (err) { }

      ElMessage.success('全套数据填充成功！')

    } catch (e) {
      console.error(e)
      ElMessage.error('获取失败，请检查ID是否正确')
    } finally {
      loading.value = false
    }
  }

  const loadData = (id) => {
    axios.get('/api/anime/' + id).then(res => {
      if (res.data.code === '200') {
        const data = res.data.data
        Object.assign(form, data)
        try {
          infoList.value = JSON.parse(data.infoBox || '[]')
          charList.value = JSON.parse(data.characterJson || '[]')
          staffList.value = JSON.parse(data.staffJson || '[]')
          epList.value = JSON.parse(data.episodesJson || '[]')
        } catch (e) { }
      }
    })
  }

  const submitForm = async (arg = false) => {
    // 修复：当从模版调用时，arg 是 Event 对象，被误判为 true
    const silent = (arg === true)

    if (!form.title) {
      if (!silent) ElMessage.warning('标题不能为空')
      throw new Error('标题为空')
    }

    form.infoBox = JSON.stringify(infoList.value)
    form.characterJson = JSON.stringify(charList.value)
    form.staffJson = JSON.stringify(staffList.value)
    form.episodesJson = JSON.stringify(epList.value)

    const url = isEditMode.value ? '/api/anime/update' : '/api/anime/add'

    try {
      const res = await axios.post(url, form)
      if (res.data.code === '200') {
        const newId = res.data.data
        if (newId) form.id = newId

        if (!silent) {
          ElMessage.success(isEditMode.value ? '修改成功' : '发布成功')
          if (isEditMode.value) {
            router.push(`/subject/${form.id}`)
          }
        }
      } else {
        const msg = res.data.msg || '操作失败'
        if (!silent) ElMessage.error(msg)
        throw new Error(msg)
      }
    } catch (e) {
      if (!silent) {
        // 如果是已经在上面抛出的业务错误，这里会再次捕获，避免重复弹窗需要判断? 
        // 简单处理：如果是 Axios 错误或系统错误才弹
        if (e.message !== (e.response?.data?.msg || '')) {
          // 这里的逻辑有点绕，简化一下：
          // 其实只要保证 failed 就弹窗即可。
          // 但上面 else 分支已经弹过了。
          // 实际上如果是 else 分支抛出的 error，e.message 就是 msg。
          // 如果是网络错误，e.message 是 "Network Error"。
          // 我们可以只在 isAxiosError 时补充弹窗。
        }

        if (axios.isAxiosError(e)) {
          ElMessage.error(e.response?.data?.msg || '网络/服务器错误')
        }
        // 如果不是 axios error 且还是这里捕获的，说明是上面 throw new Error 抛下来的， UI已经弹过了。
      }
      throw e
    }
  }

  // 批量导入相关 (番剧)
  const batchDialogVisible = ref(false)
  const batchInput = ref('')
  const batchProgress = ref('')
  const batchLoading = ref(false)
  const batchSuccessList = ref([])

  const startBatchImport = async () => {
    const ids = batchInput.value.split(/[\n,， ]+/).map(s => s.trim()).filter(s => s)
    if (ids.length === 0) return ElMessage.warning('请输入 ID')

    batchLoading.value = true
    batchProgress.value = `准备导入 ${ids.length} 个番剧...`
    batchSuccessList.value = []

    let successCount = 0
    let failCount = 0

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i]
      batchProgress.value = `正在处理 [${id}] (${i + 1}/${ids.length})...`

      try {
        // 1. 设置 ID
        form.bgmId = id
        // 2. 拉取数据 (复用现有逻辑)
        await fetchByBgmId()

        // 3. 提交数据 (需要修改 submitForm 支持不跳转)
        await submitForm(true)
        successCount++

        // 4. 记录成功
        batchSuccessList.value.push({
          id: form.id,
          title: form.title,
          bgmId: id
        })

      } catch (e) {
        console.error(e)
        failCount++
        batchProgress.value += `\n[${id}] 失败: ${e.message}`
      }

      // 简单防抖/防封
      await new Promise(r => setTimeout(r, 1000))
    }

    batchLoading.value = false
    batchProgress.value += `\n\n全部完成！成功 ${successCount}，失败 ${failCount}`
    if (successCount > 0 && failCount === 0) {
      ElMessage.success('批量导入全部成功')
      // 不再自动跳转，让用户看结果
    }
  }

  // 批量导入 VideoID 逻辑
  const batchVideoDialogVisible = ref(false)
  const batchVideoInput = ref('')

  const openBatchVideoDialog = () => {
    batchVideoInput.value = ''
    batchVideoDialogVisible.value = true
  }

  const previewVideoList = computed(() => {
    if (!batchVideoInput.value) return []

    const lines = batchVideoInput.value
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)

    const result = []
    epList.value.forEach((ep, index) => {
      if (index < lines.length) {
        result.push({
          sort: ep.sort,
          name: ep.name,
          oldId: ep.videoId,
          newId: lines[index]
        })
      }
    })
    return result
  })

  const applyBatchVideoImport = () => {
    previewVideoList.value.forEach((item, index) => {
      if (epList.value[index]) {
        epList.value[index].videoId = item.newId
      }
    })
    ElMessage.success(`成功填充 ${previewVideoList.value.length} 个 VideoID`)
    batchVideoDialogVisible.value = false
  }

  return {
    router, route, loading, isEditMode, form,
    infoList, charList, staffList, epList,
    handleCoverSuccess, fetchByBgmId, loadData, submitForm,
    batchDialogVisible, batchInput, batchProgress, batchLoading, startBatchImport, batchSuccessList,
    // New exports
    batchVideoDialogVisible, batchVideoInput, previewVideoList, openBatchVideoDialog, applyBatchVideoImport
  }
}