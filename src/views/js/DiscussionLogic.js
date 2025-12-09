import { ref, onMounted, reactive, nextTick } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { marked } from 'marked'

export function useDiscussionLogic() {
  const postList = ref([])
  const dialogVisible = ref(false)
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
  const filterType = ref('全部')
  const contentInputRef = ref(null)

  const postForm = reactive({
    userId: currentUser.id,
    title: '',
    content: '',
    topicType: '闲聊',
    animeId: null,
    customTopic: ''
  })

  // 编辑相关
  const editDialogVisible = ref(false)
  const editForm = reactive({
    id: '',
    content: ''
  })

  const searchLoading = ref(false)
  const animeOptions = ref([])
  // 常用 Emoji
  const emojiList = ['😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊', '😋', '😎', '😍', '😘', '🥰', '😗', '😙', '😚', '🙂', '🤗', '🤩', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣', '😥', '😮', '🤐', '😯', '😪', '😫', '😴', '😌', '😛', '😜', '😝', '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑', '😲', '☹️', '🙁', '😖', '😞', '😟', '😤', '😢', '😭', '😦', '😧', '😨', '😩', '🤯', '😬', '😰', '😱', '🥵', '🥶', '😳', '🤪', '😵', '😡', '😠', '🤬', '😷', '🤒', '🤕', '🤢', '🤮', '😇', '🤠', '🤡', '🥳', '🥴', '🥺', '🤥', '🤫', '🤭', '🧐', '🤓', '😈', '👿', '👹', '👺', '💀', '👻', '👽', '🤖', '💩', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾']

  // === 核心：文本插入工具 ===
  const insertText = (prefix, suffix = '') => {
    let textarea = null
    if (contentInputRef.value) {
      textarea = contentInputRef.value.textarea || contentInputRef.value
    }
    if (!textarea) textarea = document.querySelector('.clean-textarea')

    if (!textarea) {
      postForm.content += prefix + suffix
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = postForm.content
    const selected = text.substring(start, end)

    const replacement = prefix + (selected || '') + suffix
    postForm.content = text.substring(0, start) + replacement + text.substring(end)

    nextTick(() => {
      textarea.focus()
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length)
    })
  }

  // 格式化工具
  const addBold = () => insertText('**', '**')
  const addItalic = () => insertText('*', '*')
  const addDelete = () => insertText('~~', '~~')
  const addHeading = (level) => insertText('\n' + '#'.repeat(level) + ' ')

  const addLink = () => {
    ElMessageBox.prompt('请输入链接地址', '插入链接', {
      confirmButtonText: '确定', cancelButtonText: '取消',
      inputPattern: /^(https?:\/\/).+/, inputErrorMessage: '请输入正确的网址'
    }).then(({ value }) => {
      insertText(`[链接描述](${value})`)
    }).catch(() => { })
  }

  const handleImageUpload = (options) => {
    const { file, onSuccess, onError } = options
    const formData = new FormData()
    formData.append('file', file)

    axios.post('/api/file/upload', formData).then(res => {
      if (res.data.code === '200') {
        insertText(`\n![图片](${res.data.data})\n`)
        onSuccess(res.data)
      } else {
        onError(res.data.msg)
        ElMessage.error('上传失败')
      }
    }).catch(err => {
      onError(err)
      ElMessage.error('网络错误')
    })
  }

  const renderMarkdown = (text) => {
    if (!text) return ''
    return marked.parse(text, { breaks: true, gfm: true })
  }

  // === 分页与搜索状态 ===
  const page = ref(1)
  const pageSize = ref(20)
  const loading = ref(false)
  const noMore = ref(false)
  const searchKeyword = ref('')

  const loadPosts = (isRefresh = false) => {
    if (loading.value) return
    loading.value = true

    if (isRefresh) {
      page.value = 1
      postList.value = []
      noMore.value = false
    }

    const params = {
      page: page.value,
      size: pageSize.value,
      page: page.value,
      size: pageSize.value,
      keyword: searchKeyword.value,
      viewerId: currentUser.id || '' // Pass viewerId for blacklist check
    }

    axios.get('/api/post/all', { params }).then(res => {
      loading.value = false
      if (res.data.code === '200') {
        let list = res.data.data

        // 前端过滤 (保留原有的番剧/闲聊过滤逻辑，虽然搜索时通常应该由后端处理所有，这里简化处理：搜索优先，过滤次之)
        if (filterType.value === '番剧') list = list.filter(p => p.animeId)
        else if (filterType.value === '闲聊') list = list.filter(p => !p.animeId)

        if (list.length < pageSize.value) {
          noMore.value = true
        }

        const formattedList = list.map(p => ({
          ...p,
          showReply: false, replyContent: '', replies: []
        }))

        if (isRefresh) {
          postList.value = formattedList
        } else {
          postList.value.push(...formattedList)
        }

        page.value++
      }
    }).catch(() => {
      loading.value = false
    })
  }

  const loadMore = () => {
    if (!noMore.value && !loading.value) {
      loadPosts(false)
    }
  }

  const handleSearch = () => {
    loadPosts(true)
  }

  const searchAnime = (query) => {
    if (query) {
      searchLoading.value = true
      axios.get(`/api/anime/search?keyword=${query}`).then(res => {
        searchLoading.value = false
        if (res.data.code === '200') animeOptions.value = res.data.data
      })
    } else { animeOptions.value = [] }
  }

  const handleTopicChange = () => { postForm.animeId = null; postForm.customTopic = '' }
  const addEmoji = (emoji) => insertText(emoji)

  const submitPost = () => {
    if (!currentUser.id) return ElMessage.warning('请先登录')
    if (!postForm.content) return ElMessage.warning('写点内容吧')

    let finalTitle = postForm.title
    if (postForm.topicType === '自定义' && postForm.customTopic) {
      finalTitle = `${postForm.customTopic} ${postForm.title}`
    }

    const payload = {
      userId: currentUser.id,
      title: finalTitle,
      content: postForm.content,
      animeId: postForm.topicType === '番剧' ? postForm.animeId : 0
    }

    axios.post('/api/post/add', payload).then(res => {
      if (res.data.code === '200') {
        ElMessage.success('发布成功')
        postForm.title = ''; postForm.content = ''; postForm.topicType = '闲聊';
        postForm.animeId = null; postForm.customTopic = ''
        loadPosts(true)
      } else {
        ElMessage.error(res.data.msg)
      }
    })
  }

  // 交互功能
  const deletePost = (post) => {
    ElMessageBox.confirm('确定要删除这条帖子吗？', '提示', { type: 'warning' })
      .then(() => {
        axios.delete(`/api/post/delete/${post.id}`).then(res => {
          if (res.data.code === '200') { ElMessage.success('已删除'); loadPosts(true) }
        })
      })
  }

  const openEditPost = (post) => {
    ElMessage.info('编辑功能开发中') // 简单起见暂时省略，或者复用弹窗
  }

  const submitEditPost = () => { } // 略

  const likePost = (post) => {
    if (!currentUser.id) return ElMessage.warning('请先登录')
    axios.post(`/api/post/like/${post.id}`).then(res => {
      if (res.data.code === '200') { post.likes = res.data.data; ElMessage.success('点赞成功') }
    })
  }

  const toggleReply = (post) => {
    post.showReply = !post.showReply
    if (post.showReply && post.replies.length === 0) loadReplies(post)
  }

  const loadReplies = (post) => {
    axios.get(`/api/post/reply/list/${post.id}`).then(res => {
      if (res.data.code === '200') post.replies = res.data.data
    })
  }

  const submitReply = (post) => {
    if (!currentUser.id) return ElMessage.warning('请先登录')
    if (!post.replyContent.trim()) return ElMessage.warning('说点什么吧')

    const payload = {
      postId: post.id,
      userId: currentUser.id,
      content: post.replyContent
    }

    axios.post('/api/post/reply/add', payload).then(res => {
      if (res.data.code === '200') {
        ElMessage.success('回复成功')
        post.replyContent = ''
        loadReplies(post)

        //  新增：回复数 +1 
        post.replyCount = (post.replyCount || 0) + 1

        // 如果之前折叠了，自动展开
        if (!post.showReply) post.showReply = true
      }
    })
  }
  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    try {
      return new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Singapore', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      }).format(new Date(timeStr))
    } catch (e) { return timeStr }
  }

  onMounted(() => { loadPosts() })

  return {
    postList, currentUser, filterType, postForm, searchLoading, animeOptions, emojiList, contentInputRef,
    dialogVisible, searchKeyword, loading, noMore,
    loadPosts, searchAnime, handleTopicChange, addEmoji, submitPost, formatTime, handleSearch, loadMore,
    addBold, addItalic, addDelete, addHeading, addLink, handleImageUpload, renderMarkdown,
    deletePost, openEditPost, submitEditPost, likePost, toggleReply, submitReply
  }
}