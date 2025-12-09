# 阿里播放器License配置说明

## 问题背景

从2024-12-01开始，阿里云播放器的新版本要求配置license才能使用。

### 警告信息
```
Starting 2024-12-01, the new version of the player must be configured 
with a license to use. The license for the basic functions of the 
player can be applied for free and is valid for 1 year.
```

---

## 解决方案

### 已添加License配置

在 `EpisodeDetail.vue` 的播放器初始化代码中添加了 `license` 参数：

```javascript
player = new window.Aliplayer({
  id: "J_prismPlayer",
  autoplay: true,
  width: "100%",
  height: "100%",
  vid: testVideoId,
  playauth: playAuthData.playAuth,
  cover: playAuthData.videoMeta?.coverUrl || '',
  encryptType: 1,
  // 🔥 配置License（必需）
  license: {
    domain: "spectreax.com", // 申请License时填写的域名
    key: "xP9VKwtoMk14sJcPO37e2a619e3454c32846cf8f1b0ae3c08"
  }
}, function (player) {
  console.log("播放器创建成功")
})
```

---

## License说明

### 当前配置
- **域名**: `spectreax.com`
- **License Key**: `xP9VKwtoMk14sJcPO37e2a619e3454c32846cf8f1b0ae3c08`
- **有效期**: 1年（从申请日期开始）
- **费用**: 免费（基础功能）

### 配置格式

License必须是一个对象，包含两个字段：
```javascript
license: {
  domain: "spectreax.com",  // 申请License时填写的域名
  key: "your-license-key"   // 阿里云分配的License Key
}
```

> [!IMPORTANT]
> **域名说明**: License绑定的域名必须与实际访问域名一致。
> - 开发环境：如果绑定 `spectreax.com`，本地开发可能无法使用
> - 生产环境：确保域名匹配

### 如何申请License

如果License过期，需要重新申请：

1. **访问阿里云VOD控制台**
   ```
   https://help.aliyun.com/zh/vod/developer-reference/license-authorization
   ```

2. **获取License**
   - 登录阿里云账号
   - 进入视频点播控制台
   - 在"播放器SDK"中申请License
   - 免费License有效期1年

3. **更新配置**
   - 复制新的License ID
   - 替换 `EpisodeDetail.vue` 中的 `license` 值
   - 重新部署前端

---

## 验证License配置

### 检查步骤

1. **启动前端服务**
   ```bash
   cd f:\Dev\Final\acg-community-web
   npm run dev
   ```

2. **访问剧集详情页**

3. **查看浏览器Console**
   - ✅ 如果License配置正确，不会再显示警告
   - ❌ 如果仍有警告，检查License是否正确

### 预期结果

浏览器Console应该显示：
```
正在获取视频播放凭证... e0555dd6d43d71f0803f5017f0f80102
成功获取播放凭证，初始化播放器...
播放器创建成功
```

**不应该再有** "must be configured with a license" 的警告。

---

## 常见问题

### Q1: License过期后会怎样？

**现象**：播放器无法正常工作，Console显示License过期警告。

**解决**：重新申请免费License并更新配置。

### Q2: License可以用于多个域名吗？

**回答**：基础功能的免费License通常只能绑定一个域名。如需多域名支持，需要申请商业License。

### Q3: 本地开发环境需要License吗？

**回答**：是的，从2024-12-01起，即使是本地开发环境（localhost）也需要配置License。

---

## 相关文档

- [阿里播放器License授权说明](https://help.aliyun.com/zh/vod/developer-reference/license-authorization)
- [阿里播放器配置参数](https://help.aliyun.com/document_detail/125570.html)
- [阿里播放器SDK下载](https://help.aliyun.com/document_detail/51992.html)

---

## 更新记录

- **2025-12-09**: 添加License配置 `xP9VKwtoMk14sJcPO37e2a619e3454c32846cf8f1b0ae3c08`
- **有效期至**: 2025-12-09 + 1年 = **2026-12-09**（预估）

> [!IMPORTANT]
> **到期提醒**: 请在2026年12月前重新申请License！
