import { ref, onMounted, reactive } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { marked } from 'marked'

export function useJournalLogic() {
    const postList = ref([])
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
    const contentInputRef = ref(null)

    // 编辑相关
    const editDialogVisible = ref(false)
    const editForm = reactive({
        id: '',
        content: ''
    })

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
            keyword: searchKeyword.value,
            type: 1  // 关键：只获取长文/日志 (type=1)
        }

        axios.get('/api/post/all', { params }).then(res => {
            loading.value = false
            if (res.data.code === '200') {
                let list = res.data.data

                // 前端过滤：排除所有番剧相关的帖子（有animeId的）
                list = list.filter(p => !p.animeId || p.animeId === 0)

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

    // 交互功能
    const deletePost = (post) => {
        ElMessageBox.confirm('确定要删除这条日志吗？', '提示', { type: 'warning' })
            .then(() => {
                axios.delete(`/api/post/delete/${post.id}`).then(res => {
                    if (res.data.code === '200') { ElMessage.success('已删除'); loadPosts(true) }
                })
            })
    }

    const openEditPost = (post) => {
        ElMessage.info('编辑功能开发中')
    }

    const submitEditPost = () => { }

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

                post.replyCount = (post.replyCount || 0) + 1

                if (!post.showReply) post.showReply = true
            }
        })
    }

    const formatTime = (timeStr) => {
        if (!timeStr) return ''
        try {
            return new Intl.DateTimeFormat('zh-CN', {
                timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
            }).format(new Date(timeStr))
        } catch (e) { return timeStr }
    }

    onMounted(() => { loadPosts() })

    return {
        postList, currentUser, contentInputRef,
        editDialogVisible, editForm, searchKeyword, loading, noMore,
        loadPosts, formatTime, handleSearch, loadMore,
        renderMarkdown,
        deletePost, openEditPost, submitEditPost, likePost, toggleReply, submitReply, loadReplies
    }
}
