# EpisodeDetail.vue 播放器改造测试指南

## 🎯 改造内容

已将 `EpisodeDetail.vue` 中的播放器从**硬编码 playAuth** 改为**动态从后端API获取**。

### 主要变更

1. ✅ 添加 `fetchPlayAuth(videoId)` 函数调用后端API
2. ✅ 将 `initPlayer()` 改为异步函数
3. ✅ 使用后端返回的 `playAuth` 和 `coverUrl` 初始化播放器
4. ✅ 添加集数切换时的播放器重新加载逻辑
5. ✅ 添加错误提示（如果获取凭证失败）

### 当前配置

- **测试视频ID**: `e0555dd6d43d71f0803f5017f0f80102`（临时硬编码）
- **后端API**: `GET /api/video/play-auth/{videoId}`
- **自动播放**: 启用
- **封面图**: 从后端API返回的 `videoMeta.coverUrl`

---

## 🧪 测试步骤

### 1. 启动后端服务

```bash
cd f:\Dev\Final\acgcommunity
# 手动启动后端（按照你的指示，我不运行编译命令）
```

### 2. 启动前端服务

```bash
cd f:\Dev\Final\acg-community-web
npm run dev
```

### 3. 访问剧集详情页

在浏览器中访问任意剧集详情页，例如：
```
http://localhost:5173/play/{subjectId}/{episodeId}
```

### 4. 验证功能

#### ✅ 正常流程验证

1. **播放器加载**
   - 打开浏览器开发者工具（F12）→ Console
   - 应该看到日志：
     ```
     正在获取视频播放凭证... e0555dd6d43d71f0803f5017f0f80102
     成功获取播放凭证，初始化播放器...
     播放器创建成功
     ```

2. **视频播放**
   - 播放器应该自动加载视频
   - 视频可以正常播放
   - 封面图显示正确（来自阿里云）

3. **集数切换**
   - 点击侧边栏的其他集数
   - 应该看到日志：`切换集数，重新初始化播放器: {newEpisodeId}`
   - 播放器重新加载（虽然还是同一个测试视频）

#### ⚠️ 异常情况验证

1. **后端未启动**
   - 应该显示错误提示："获取播放凭证失败，请稍后重试"
   - Console中有错误日志

2. **网络错误**
   - 模拟网络中断，刷新页面
   - 应该显示友好的错误提示

---

## 📊 API请求示例

### 请求

```bash
GET http://localhost:9090/api/video/play-auth/e0555dd6d43d71f0803f5017f0f80102
```

### 预期响应

```json
{
  "code": "200",
  "msg": "成功",
  "data": {
    "videoId": "e0555dd6d43d71f0803f5017f0f80102",
    "playAuth": "eyJTZWN1cml0eVRva2VuIjoiQ0FJUzN3...",
    "videoMeta": {
      "title": "[Nekomoe kissaten][BanG Dream! It's MyGO!!!!!][01][1080p][JPSC].mp4",
      "duration": 1431.444,
      "coverUrl": "https://video.spectreax.com/e0555dd6d43d71f0803f5017f0f80102/snapshots/cbe0cf5aa3e544c88badd23a99243f5b-00005.jpg",
      "status": "Normal"
    }
  }
}
```

---

## 🔍 开发者工具检查点

### Network标签
- 查看是否有 `/api/video/play-auth/...` 请求
- 状态码应为 `200`
- 响应时间应该在 1-3 秒内

### Console标签
查看关键日志：
```javascript
正在获取视频播放凭证... e0555dd6d43d71f0803f5017f0f80102
成功获取播放凭证，初始化播放器...
播放器创建成功
```

### Elements标签
检查播放器DOM：
```html
<div id="J_prismPlayer" class="prism-player">
  <!-- 阿里播放器内部结构 -->
</div>
```

---

## 🐛 常见问题排查

### 问题1: 播放器不显示

**检查**:
- 后端是否启动？
- API请求是否成功？（检查Network标签）
- Console是否有错误？

**解决**:
```bash
# 确保后端服务运行在 9090 端口
curl http://localhost:9090/api/video/play-auth/e0555dd6d43d71f0803f5017f0f80102
```

### 问题2: PlayAuth过期

**现象**: 视频无法播放，提示"凭证已过期"

**原因**: PlayAuth默认有效期50分钟

**解决**: 刷新页面重新获取凭证

### 问题3: CORS错误

**检查**: Console中是否有跨域错误

**解决**: 后端需要配置CORS，允许前端域名访问

---

## 🚀 后续优化方向

### 1. 视频ID映射系统

当前使用固定测试视频ID，后续需要：
- 创建数据库表存储 `episodeId → videoId` 映射
- 修改代码从 `currentEp.videoId` 获取真实ID
- 提供管理界面绑定视频

### 2. 播放器配置优化

可以添加更多配置选项：
```javascript
{
  autoplay: false,           // 不自动播放
  isLive: false,             // 非直播
  rePlay: true,              // 显示重播按钮
  playsinline: true,         // 移动端内联播放
  preload: true,             // 预加载
  controlBarVisibility: 'hover', // 控制栏自动隐藏
  useH5Prism: true,          // 使用H5播放器
}
```

### 3. 错误处理增强

```javascript
// 添加播放器错误监听
player.on('error', function(err) {
  console.error('播放器错误:', err)
  ElMessage.error('视频播放失败: ' + err.message)
})
```

### 4. 播放进度记忆

```javascript
// 保存播放进度
player.on('pause', function() {
  const currentTime = player.getCurrentTime()
  localStorage.setItem(`ep_${currentEpId.value}_progress`, currentTime)
})

// 恢复播放进度
const savedTime = localStorage.getItem(`ep_${currentEpId.value}_progress`)
if (savedTime) {
  player.seek(parseFloat(savedTime))
}
```

---

## 📝 代码变更总结

### EpisodeDetail.vue

**新增导入**:
```javascript
import { watch } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
```

**新增函数**:
- `fetchPlayAuth(videoId)` - 调用后端API
- `initPlayer()` - 改为async异步函数

**新增监听**:
- `watch(currentEpId, ...)` - 监听集数切换

**总代码行数**: 约增加 40 行

---

## ✅ 验收标准

- [ ] 后端API正常响应
- [ ] 前端成功获取playAuth
- [ ] 播放器正常加载视频
- [ ] 视频可以正常播放
- [ ] 封面图正确显示
- [ ] 切换集数时播放器重新加载
- [ ] 错误提示友好清晰
- [ ] Console无报错（除了正常的阿里SDK日志）

---

**测试完成后请反馈结果，我会根据情况进一步优化！** 🎉
