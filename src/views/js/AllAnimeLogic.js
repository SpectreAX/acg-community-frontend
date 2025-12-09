import { ref, reactive, onMounted, watch } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

export function useAllAnimeLogic() {
    const router = useRouter()
    const list = ref([])
    const loading = ref(false)
    const total = ref(0)

    // 筛选表单
    const filterForm = reactive({
        page: 1,
        size: 20,
        year: '全部',
        genre: '全部',
        region: '全部',
        category: '全部', // TV, WEB, etc
        source: '全部',   // 原创, 漫改, etc
        sort: 'rating', // rating, time, date
        order: 'desc' // desc, asc
    })

    // 选项配置
    const yearOptions = ['全部', '2024', '2023', '2022', '2021', '2020', '2019', '2010-2018', '2000-2009', '90年代']

    // 完整类型列表
    const genreOptions = [
        '全部', '科幻', '喜剧', '同人', '百合',
        '校园', '惊悚', '后宫', '机战', '悬疑',
        '恋爱', '奇幻', '推理', '运动', '耽美',
        '音乐', '战斗', '冒险', '萌系', '穿越',
        '玄幻', '乙女', '恐怖', '历史', '日常',
        '剧情', '武侠', '美食', '职场'
    ]

    // 地区
    const regionOptions = [
        '全部', '日本', '欧美', '中国', '美国',
        '韩国', '法国', '中国香港', '英国', '俄罗斯',
        '苏联', '捷克', '中国台湾', '马来西亚'
    ]

    // 分类
    const categoryOptions = ['全部', 'TV', 'WEB', 'OVA', '剧场版', '动态漫画', '其他']

    // 来源
    const sourceOptions = ['全部', '原创', '漫画改', '游戏改', '小说改', '影视改']

    const sortOptions = [
        { label: '最高评分', value: 'rating' },
        { label: '最新时间', value: 'date' }
    ]

    const fetchList = () => {
        loading.value = true
        const params = { ...filterForm }
        // 处理特殊值
        if (params.year === '全部') delete params.year
        if (params.genre === '全部') delete params.genre
        if (params.region === '全部') delete params.region
        if (params.category === '全部') delete params.category
        if (params.source === '全部') delete params.source

        axios.get('/api/anime/filter', { params })
            .then(res => {
                if (res.data.code === '200') {
                    list.value = res.data.data
                    // 简易处理：后端还没返回 total，暂时不分页或假定有更多
                }
            })
            .finally(() => loading.value = false)
    }

    // 监听筛选变化自动请求
    watch(() => [
        filterForm.year, filterForm.genre, filterForm.region,
        filterForm.category, filterForm.source,
        filterForm.sort, filterForm.order
    ], () => {
        filterForm.page = 1
        fetchList()
    })

    // 上一页/下一页
    const handlePageChange = (val) => {
        filterForm.page = val
        fetchList()
    }

    const goToDetail = (id) => {
        router.push('/subject/' + id)
    }

    // 格式化函数
    const formatRating = (val) => val ? Number(val).toFixed(1) : 'N/A'

    const toggleOrder = () => {
        filterForm.order = filterForm.order === 'desc' ? 'asc' : 'desc'
    }

    onMounted(() => {
        fetchList()
    })

    return {
        list, loading, filterForm,
        yearOptions, genreOptions, sortOptions, regionOptions, categoryOptions, sourceOptions,
        handlePageChange, goToDetail, formatRating, toggleOrder
    }
}
