import { ref, onMounted, reactive, nextTick, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'

export function useProfileLogic() {
  const route = useRoute()
  const currentUser = reactive(JSON.parse(localStorage.getItem('user') || '{}'))
  const friendStatus = ref(-1)
  const friendRequests = ref([])
  const friendList = ref([])
  const blockedList = ref([])
  const showRequestsVisible = ref(false)

  const userInfo = ref({})
  const stats = ref({})
  const allCollections = ref([])
  const activeTab = ref('3')
  const defaultAvatar = 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png'

  const editVisible = ref(false)
  const editForm = reactive({ id: null, nickname: '', avatar: '', bio: '' })
  const chartRef = ref(null)
  const checkFriendStatus = (myId, targetId) => {
    if (!myId || !targetId || myId == targetId) {
      friendStatus.value = -1
      return
    }
    axios.get(`/api/friend/check?myId=${myId}&targetId=${targetId}`).then(res => {
      if (res.data.code === '200') friendStatus.value = res.data.data
    })
  }

  const loadFriendRequests = () => {
    axios.get('/api/friend/request/list?userId=' + currentUser.id).then(res => {
      if (res.data.code === '200') friendRequests.value = res.data.data
    })
  }

  const loadFriendList = () => {
    if (userInfo.value.id === currentUser.id) {
      axios.get('/api/friend/list?userId=' + currentUser.id).then(res => {
        if (res.data.code === '200') friendList.value = res.data.data
      })
      axios.get('/api/friend/block/list?userId=' + currentUser.id).then(res => {
        if (res.data.code === '200') blockedList.value = res.data.data
      })
    }
  }

  // 封装加载逻辑
  const initData = (routeId) => {
    if (routeId) {
      // 访问他人主页
      const myId = currentUser.id ? currentUser.id : ''
      axios.get(`/api/user/${routeId}?viewerId=${myId}`).then(res => {
        if (res.data.code === '200') {
          userInfo.value = res.data.data
          loadStats(routeId)
          loadCollection(routeId)
          checkFriendStatus(currentUser.id, routeId)
          loadFriendList() // Load their friends
        } else if (res.data.code === '403') {
          // Handle blocked/hidden user
          userInfo.value = {
            nickname: '用户已隐藏',
            avatar: defaultAvatar,
            bio: '该用户已将您拉黑或您无权查看',
            id: routeId,
            createTime: null
          }
          // Clear other data
          stats.value = {}
          allCollections.value = []
          friendStatus.value = -2 // Or specific status for "Blocked by them"
        } else {
          ElMessage.error('用户不存在')
        }
      })
    } else {
      // 访问自己主页
      const userStr = localStorage.getItem('user')
      if (userStr) {
        userInfo.value = JSON.parse(userStr)
        loadStats(userInfo.value.id)
        loadCollection(userInfo.value.id)
        loadFriendRequests()
        loadFriendRequests()
        loadFriendList()
        friendStatus.value = -1 // 也就是自己
      }
    }
  }

  onMounted(() => {
    initData(route.params.id)
  })

  // 监听路由变化，解决跳转页面不刷新问题
  watch(() => route.params.id, (newId) => {
    initData(newId)
  })

  const handleAvatarSuccess = (res) => {
    if (res.code === '200') {
      editForm.avatar = res.data
      ElMessage.success('上传成功')
    } else {
      ElMessage.error('上传失败: ' + res.msg)
    }
  }

  const loadStats = (uid) => {
    const myId = currentUser.id ? currentUser.id : ''
    axios.get(`/api/collection/stats?userId=${uid}&viewerId=${myId}`).then(res => {
      if (res.data.code === '200') {
        stats.value = res.data.data
        nextTick(() => {
          initChart(res.data.data.chartData)
        })
      }
    })
  }

  const initChart = (data) => {
    if (!chartRef.value) return
    const myChart = echarts.init(chartRef.value)
    const option = {
      tooltip: { trigger: 'axis' },
      grid: { top: 10, bottom: 20, left: 0, right: 0 },
      xAxis: {
        type: 'category',
        data: ['10', '9', '8', '7', '6', '5', '4', '3', '2', '1'],
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#999', fontSize: 10 }
      },
      yAxis: { show: false },
      series: [{
        data: data,
        type: 'bar',
        itemStyle: { color: '#409eff', borderRadius: [2, 2, 0, 0] },
        barWidth: '60%'
      }]
    }
    myChart.setOption(option)
  }

  const loadCollection = (uid) => {
    const myId = currentUser.id ? currentUser.id : ''
    axios.get(`/api/collection/list?userId=${uid}&viewerId=${myId}`).then(res => {
      if (res.data.code === '200') allCollections.value = res.data.data
    })
  }

  const filterList = (status) => {
    return allCollections.value.filter(item => item.status.status == status)
  }

  const openEdit = () => {
    editForm.id = userInfo.value.id
    editForm.nickname = userInfo.value.nickname
    editForm.avatar = userInfo.value.avatar
    editForm.bio = userInfo.value.bio
    editVisible.value = true
  }

  const saveProfile = () => {
    axios.post('/api/user/update', editForm).then(res => {
      if (res.data.code === '200') {
        ElMessage.success('保存成功')
        const newUser = { ...userInfo.value, ...editForm }
        localStorage.setItem('user', JSON.stringify(newUser))
        userInfo.value = newUser
        editVisible.value = false
      } else {
        ElMessage.error(res.data.msg)
      }
    })
  }

  const sendFriendRequest = () => {
    axios.post('/api/friend/request/send', {
      senderId: currentUser.id,
      receiverId: userInfo.value.id
    }).then(res => {
      if (res.data.code === '200') {
        ElMessage.success('申请已发送')
        friendStatus.value = 2
      } else {
        ElMessage.error(res.data.msg)
      }
    }).catch(err => {
      console.error(err)
      ElMessage.error('请求发送失败，请检查网络或联系管理员')
    })
  }

  const handleRequest = (req, status) => {
    // status: 1 Accept, 2 Decline
    axios.post('/api/friend/request/handle', {
      id: req.id,
      status: status
    }).then(res => {
      if (res.data.code === '200') {
        ElMessage.success(status === 1 ? '已同意' : '已拒绝')
        loadFriendRequests() // 刷新列表
        loadFriendList() // 刷新好友列表
        // 如果操作的是当前正在查看的用户发的请求，更新状态
        if (status === 1 && userInfo.value.id === req.senderId) {
          friendStatus.value = 1
        }
      }
    })
  }

  const deleteFriend = (friendId) => {
    return axios.post('/api/friend/delete', {
      userId: currentUser.id,
      friendId: friendId
    })
  }

  const blockUser = (blockId) => {
    return axios.post('/api/friend/block', {
      userId: currentUser.id,
      blockId: blockId
    })
  }

  // Handle block from profile header
  const handleBlock = () => {
    blockUser(userInfo.value.id).then(res => {
      if (res.data.code === '200') {
        ElMessage.success('已拉黑该用户')
        friendStatus.value = -2
        loadFriendList() // Refresh lists
      } else {
        ElMessage.error(res.data.msg)
      }
    }).catch(err => {
      ElMessage.error('操作失败')
    })
  }

  const handleUnfriend = () => {
    deleteFriend(userInfo.value.id).then(res => {
      if (res.data.code === '200') {
        ElMessage.success('已解除好友关系')
        friendStatus.value = 0
        loadFriendList()
        loadStats(currentUser.id)
      } else {
        ElMessage.error(res.data.msg)
      }
    })
  }

  const unblockUser = (blockId) => {
    return axios.post('/api/friend/unblock', {
      userId: currentUser.id,
      blockId: blockId
    })
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    return timeStr.split('T')[0]
  }

  const formatRate = (val) => {
    return val ? val.toFixed(1) : '0.0'
  }

  const handleHeaderUnblock = () => {
    unblockUser(userInfo.value.id).then(res => {
      if (res.data.code === '200') {
        ElMessage.success('已解除拉黑')
        friendStatus.value = 0
        loadFriendList()
      }
    })
  }

  return {
    userInfo, stats, allCollections, activeTab, defaultAvatar,
    editVisible, editForm, chartRef, currentUser,
    friendStatus, friendRequests, friendList, showRequestsVisible,
    handleAvatarSuccess, loadStats, loadCollection, filterList,
    openEdit, saveProfile, formatTime, formatRate,
    sendFriendRequest, handleRequest, loadFriendRequests,
    deleteFriend, blockUser, blockedList, unblockUser, handleBlock, handleHeaderUnblock, handleUnfriend
  }
}
