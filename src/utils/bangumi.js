import axios from 'axios'
import { ElMessage } from 'element-plus'

/**
 * 根据 Bangumi ID 获取完整的番剧数据（清洗后的格式）
 * @param {Number} bgmId 
 * @returns {Promise<Object>} 组装好的 Form 对象
 */
export const fetchBangumiData = async (bgmId) => {
  if (!bgmId) throw new Error("No Bangumi ID")

  try {
    // 1. 基础信息
    const res = await axios.get(`/bgm-api/v0/subjects/${bgmId}`)
    const data = res.data

    const form = {
      bgmId: bgmId,
      title: data.name_cn || data.name,
      summary: data.summary,
      rating: data.rating?.score || 0,
      totalEpisodes: data.total_episodes || data.eps || 0,
      tags: '',
      coverUrl: '',
      platform: 'TV动画',
      infoBox: '',
      characterJson: '',
      staffJson: '',
      episodesJson: ''
    }

    if (data.images) {
      form.coverUrl = data.images.large || data.images.common
    }

    if (data.platform) {
      const map = { 'TV': 'TV动画', 'Web': 'WEB动画', 'OVA': 'OVA', 'Movie': '剧场版' }
      form.platform = map[data.platform] || data.platform
    }

    if (data.tags && Array.isArray(data.tags)) {
      // 定义关键标签池 (地区 & 来源)
      const keyTags = [
        '日本', '中国', '欧美', '美国', '韩国', '英国', '法国', '俄罗斯', '中国台湾', '中国香港',
        '原创', '漫改', '漫画改', '游戏改', '小说改', '影视改', '轻小说改'
      ]

      // 1. 先提取所有匹配的关键标签
      const foundKeys = data.tags
        .filter(t => keyTags.includes(t.name))
        .map(t => t.name)

      // 2. 再提取普通标签，补充到总数不超过 8 个
      const normalTags = data.tags
        .filter(t => !keyTags.includes(t.name))
        .slice(0, 8 - foundKeys.length)
        .map(t => t.name)

      // 3. 合并并去重
      form.tags = Array.from(new Set([...foundKeys, ...normalTags])).join(',')
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
      form.infoBox = JSON.stringify(newList)
    }

    // 2. 获取角色
    const charRes = await axios.get(`/bgm-api/v0/subjects/${bgmId}/characters`)
    if (Array.isArray(charRes.data)) {
      // 排序：主角 > 配角 > 客串
      const sortedChars = charRes.data.sort((a, b) => {
        const roleA = a.relation || ''
        const roleB = b.relation || ''
        if (roleA === '主角' && roleB !== '主角') return -1
        if (roleA !== '主角' && roleB === '主角') return 1
        if (roleA === '配角' && roleB !== '配角') return -1
        if (roleA !== '配角' && roleB === '配角') return 1
        return 0
      })

      const charList = sortedChars.map(c => ({
        name: c.name,
        role: c.relation,
        image: c.images?.grid || '',
        cv: c.actors && c.actors[0] ? c.actors[0].name : ''
      }))
      form.characterJson = JSON.stringify(charList)
    }

    // 3. 获取Staff
    const staffRes = await axios.get(`/bgm-api/v0/subjects/${bgmId}/persons`)
    if (Array.isArray(staffRes.data)) {
      const rolePriority = {
        '动画制作': 1, '原作': 2, '导演': 3, '系列构成': 4, '人物设定': 5,
        '作画监督': 6, '脚本': 7, '分镜': 8, '演出': 9, '制片人': 10
      }

      const staffList = staffRes.data
        .sort((a, b) => {
          const scoreA = rolePriority[a.relation] || 999
          const scoreB = rolePriority[b.relation] || 999
          return scoreA - scoreB
        })
        .map(p => ({ name: p.name, role: p.relation }))

      form.staffJson = JSON.stringify(staffList)
    }

    // 4. 获取章节
    try {
      const epRes = await axios.get('/bgm-api/v0/episodes', {
        params: { subject_id: bgmId, type: 0, limit: 100 }
      })
      if (epRes.data && Array.isArray(epRes.data.data)) {
        form.totalEpisodes = epRes.data.total // 修正真实集数
        const epList = epRes.data.data
          .filter(ep => ep.type === 0)
          .map(ep => ({
            id: ep.id,
            sort: ep.sort,
            name: ep.name_cn || ep.name,
            desc: ep.desc,
            airdate: ep.airdate
          })).sort((a, b) => a.sort - b.sort)

        form.episodesJson = JSON.stringify(epList)
      }
    } catch (err) { console.warn(err) }

    return form

  } catch (e) {
    console.error("抓取失败", e)
    throw e
  }
}