import { ref, reactive, nextTick } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'

export function useArticlePublishLogic() {
    const router = useRouter()
    const contentInputRef = ref(null)
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}')

    const form = reactive({
        title: '',
        content: '',
        tags: '',
        isPublic: 'public', // 'public' or 'private'
        coverImage: ''
    })

    // === 文本插入工具 (复用逻辑) ===
    const insertText = (prefix, suffix = '') => {
        let textarea = null
        if (contentInputRef.value) {
            // 兼容 Element Plus Input 或原生 Textarea
            textarea = contentInputRef.value.textarea || contentInputRef.value
        }

        if (!textarea) {
            form.content += prefix + suffix
            return
        }

        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const text = form.content
        const selected = text.substring(start, end)

        const replacement = prefix + (selected || '') + suffix
        form.content = text.substring(0, start) + replacement + text.substring(end)

        nextTick(() => {
            textarea.focus()
            textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length)
        })
    }

    // 工具栏功能
    const addBold = () => insertText('**', '**')
    const addItalic = () => insertText('*', '*')
    const addUnderline = () => insertText('<u>', '</u>')
    const addStrike = () => insertText('~~', '~~')
    const addHeading = () => insertText('\n## ')
    const addQuote = () => insertText('\n> ')
    const addCode = () => insertText('\n```\n', '\n```\n')
    const addLink = () => {
        ElMessageBox.prompt('请输入链接地址', '插入链接', {
            confirmButtonText: '确定', cancelButtonText: '取消',
            inputPattern: /^(https?:\/\/).+/, inputErrorMessage: '请输入正确的网址'
        }).then(({ value }) => {
            insertText(`[链接描述](${value})`)
        }).catch(() => { })
    }

    // 模拟图片上传 (实际上后端接口)
    const handleImageUpload = (options) => {
        const { file, onSuccess, onError } = options
        const formData = new FormData()
        formData.append('file', file)

        axios.post('/api/file/upload', formData).then(res => {
            if (res.data.code === '200') {
                // 对于长日志，图片通常插入到正文中
                // 需求变更为：在上传区域显示预览
                // insertText(`\n![图片](${res.data.data})\n`)
                form.coverImage = res.data.data
                onSuccess(res.data)
            } else {
                onError(res.data.msg)
                ElMessage.error('上传失败: ' + res.data.msg)
            }
        }).catch(err => {
            onError(err)
            ElMessage.error('网络错误')
        })
    }

    // 提交日志
    const submitArticle = () => {
        if (!currentUser.id) return ElMessage.warning('请先登录')
        if (!form.title.trim()) return ElMessage.warning('请输入标题')
        if (!form.content.trim()) return ElMessage.warning('请输入正文内容')

        // 构造提交数据
        const payload = {
            userId: currentUser.id,
            title: form.title,
            content: form.content,
            type: 1, // 1 代表长日志 Article
            // 处理 tags -> 既然后端没专门 Tag 表，暂时可以借用 content 或 title 做简单处理，
            // 或者如果后端完全没 Tag 字段，这里只能先忽略 Tag 或拼接到内容里。
            // 根据 Controller 逻辑，只有 title/content/animeId/episodeId/type。
            // 我们可以把 tags 拼接到 content 底部或者 title 里 ?
            // 暂时忽略 Tag 的持久化，或者拼在 content 尾部。
        }

        // 如果 Tag 有值，追加到文末
        if (form.tags) {
            payload.content += `\n\nTags: ${form.tags}`
        }

        axios.post('/api/post/add', payload).then(res => {
            if (res.data.code === '200') {
                ElMessage.success('日志发表成功！')
                router.push('/discussion') // 或者跳转到详情页
            } else {
                ElMessage.error(res.data.msg)
            }
        })
    }

    return {
        form, contentInputRef,
        addBold, addItalic, addUnderline, addStrike, addHeading, addQuote, addCode, addLink,

        handleImageUpload, submitArticle,
        goBack: () => router.back()
    }
}
