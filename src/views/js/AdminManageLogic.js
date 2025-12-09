import { ref, onMounted, reactive } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'
import { useRouter } from 'vue-router'
import { fetchBangumiData } from '../../utils/bangumi.js' // 👈 引入工具

export function useAdminManageLogic() {
  const router = useRouter()
  const userList = ref([])
  const postList = ref([])
  const animeList = ref([])
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')

  // 多选相关
  const multipleSelection = ref([])

  // 编辑用户相关
  const editDialogVisible = ref(false)
  const editForm = reactive({ id: null, username: '', nickname: '', role: 1 })

  onMounted(() => {
    if (currentUser.role !== 0) {
      ElMessage.error('无权访问')
      router.push('/')
      return
    }
    loadUsers()
    loadPosts()
    loadAnimes()
  })

  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    try {
      const date = new Date(timeStr)
      return new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      }).format(date)
    } catch (e) { return timeStr }
  }

  // === 番剧管理 ===
  const loadAnimes = () => {
    axios.get('/api/anime/list').then(res => {
      animeList.value = res.data.data
    })
  }

  const handleSelectionChange = (val) => {
    multipleSelection.value = val
  }

  // 👇👇👇 核心：执行更新逻辑 👇👇👇
  const executeUpdate = async (list) => {
    if (list.length === 0) return

    const loading = ElLoading.service({
      lock: true,
      text: `正在更新 0/${list.length} ...`,
      background: 'rgba(0, 0, 0, 0.7)',
    })

    let successCount = 0
    let failCount = 0

    for (let i = 0; i < list.length; i++) {
      const item = list[i]
      loading.setText(`正在更新 (${i + 1}/${list.length}): ${item.title}`)

      if (!item.bgmId) {
        failCount++
        continue
      }

      try {
        // 1. 抓取新数据
        const newData = await fetchBangumiData(item.bgmId)
        // 2. 补上本地数据库ID (更新的关键)
        newData.id = item.id
        // 3. 发送更新请求
        await axios.post('/api/anime/update', newData)
        successCount++
      } catch (e) {
        console.error(e)
        failCount++
      }
    }

    loading.close()
    ElMessage.success(`更新完成：成功 ${successCount}，失败 ${failCount}`)
    loadAnimes() // 刷新列表
  }

  // 更新选中
  const updateSelected = () => {
    if (multipleSelection.value.length === 0) return ElMessage.warning('请先勾选番剧')

    ElMessageBox.confirm(
      `确定要更新选中的 ${multipleSelection.value.length} 部番剧吗？`, '提示',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    ).then(() => {
      executeUpdate(multipleSelection.value)
    })
  }

  // 更新全部
  const updateAll = () => {
    ElMessageBox.confirm(
      `确定要更新列表中的所有番剧吗？这可能需要一些时间。`, '提示',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    ).then(() => {
      executeUpdate(animeList.value)
    })
  }

  // 更新单个 (在表格行操作里调用)
  const updateSingle = (row) => {
    executeUpdate([row])
  }

  // 批量删除
  const deleteSelected = () => {
    if (multipleSelection.value.length === 0) return ElMessage.warning('请先勾选番剧')

    ElMessageBox.confirm(
      `确定要删除选中的 ${multipleSelection.value.length} 部番剧吗？此操作不可恢复！`, '危险操作警示',
      { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'error' }
    ).then(async () => {

      const list = multipleSelection.value
      const loading = ElLoading.service({
        lock: true,
        text: `正在删除 0/${list.length} ...`,
        background: 'rgba(0, 0, 0, 0.7)',
      })

      let successCount = 0
      let failCount = 0

      for (let i = 0; i < list.length; i++) {
        const item = list[i]
        loading.setText(`正在删除 (${i + 1}/${list.length}): ${item.title}`)

        try {
          await axios.delete('/api/anime/delete/' + item.id)
          successCount++
        } catch (e) {
          console.error(e)
          failCount++
        }
      }

      loading.close()
      ElMessage.success(`删除完成：成功 ${successCount}，失败 ${failCount}`)
      loadAnimes()
    }).catch(() => { })
  }

  const editAnime = (id) => router.push('/admin/edit/' + id)
  const deleteAnime = (id) => {
    axios.delete('/api/anime/delete/' + id).then(res => {
      if (res.data.code === '200') {
        ElMessage.success('已删除')
        loadAnimes()
      }
    })
  }

  // === 用户 & 评论管理 (保持不变) ===
  const loadUsers = () => { axios.get('/api/admin/user/list').then(res => { userList.value = res.data.data }) }
  const loadPosts = () => { axios.get('/api/admin/post/list').then(res => { postList.value = res.data.data }) }
  const openUserEdit = (user) => { editForm.id = user.id; editForm.username = user.username; editForm.nickname = user.nickname; editForm.role = user.role; editDialogVisible.value = true }
  const submitUserEdit = () => { axios.post('/api/admin/user/update', editForm).then(res => { if (res.data.code === '200') { ElMessage.success('成功'); editDialogVisible.value = false; loadUsers() } }) }
  const deleteUser = (id) => { axios.delete('/api/admin/user/delete/' + id).then(res => { if (res.data.code === '200') { ElMessage.success('已删除'); loadUsers() } }) }
  const deletePost = (id) => { axios.delete('/api/admin/post/delete/' + id).then(res => { if (res.data.code === '200') { ElMessage.success('已删除'); loadPosts() } }) }

  // 跳转到番剧详情
  const goToSubject = (id) => {
    router.push('/subject/' + id)
  }

  // === 新增：管理员添加用户 ===
  const addUserDialogVisible = ref(false)
  const addUserForm = reactive({ username: '', password: '', nickname: '', role: 1 })

  const openUserAdd = () => {
    addUserForm.username = ''
    addUserForm.password = ''
    addUserForm.nickname = ''
    addUserForm.role = 1
    addUserDialogVisible.value = true
  }

  const submitUserAdd = () => {
    if (!addUserForm.username || !addUserForm.password) {
      ElMessage.error('用户名和密码不能为空')
      return
    }
    axios.post('/api/admin/user/add', addUserForm).then(res => {
      if (res.data.code === '200') {
        ElMessage.success('添加成功')
        addUserDialogVisible.value = false
        loadUsers()
      } else {
        ElMessage.error(res.data.msg || '添加失败')
      }
    })
  }

  return {
    router, currentUser, userList, postList, animeList,
    editDialogVisible, editForm, multipleSelection,
    formatTime, openUserEdit, submitUserEdit,
    editAnime, deleteAnime, deleteUser, deletePost,
    handleSelectionChange, updateSelected, updateAll, updateSingle, deleteSelected,
    goToSubject,
    // Export new variables/functions
    addUserDialogVisible, addUserForm, openUserAdd, submitUserAdd
  }
}