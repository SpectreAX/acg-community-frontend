<template>
  <div class="publish-container">
    <div class="page-title">
      <el-button link @click="goBack">
        <el-icon size="24"><ArrowLeft /></el-icon>
      </el-button>
      发表新日志
    </div>

    <!-- 标题 -->
    <div class="form-group">
      <div class="form-label">标题</div>
      <div class="form-content">
        <el-input v-model="form.title" placeholder="请输入标题" size="large" />
      </div>
    </div>

    <!-- 正文 -->
    <div class="form-group">
      <div class="form-label">正文</div>
      <div class="form-content editor-box">
        <!-- 工具栏 -->
        <div class="toolbar">
          <el-tooltip content="加粗"><div class="tool-btn" @click="addBold"><b>B</b></div></el-tooltip>
          <el-tooltip content="斜体"><div class="tool-btn italic" @click="addItalic">I</div></el-tooltip>
          <el-tooltip content="下划线"><div class="tool-btn underline" @click="addUnderline">U</div></el-tooltip>
          <el-tooltip content="删除线"><div class="tool-btn strike" @click="addStrike">S</div></el-tooltip>
          <div class="divider"></div>
          
          <el-upload action="" :http-request="handleImageUpload" :show-file-list="false" accept="image/*" style="display:inline-flex">
             <el-tooltip content="插入图片"><div class="tool-btn"><el-icon><Picture /></el-icon></div></el-tooltip>
          </el-upload>
          
          <el-tooltip content="插入链接"><div class="tool-btn" @click="addLink"><el-icon><Link /></el-icon></div></el-tooltip>
          <div class="divider"></div>

          <el-tooltip content="标题"><div class="tool-btn" @click="addHeading" style="font-weight: bold;">H</div></el-tooltip>
          <el-tooltip content="引用"><div class="tool-btn" @click="addQuote"><el-icon><ChatLineSquare /></el-icon></div></el-tooltip>
          <el-tooltip content="代码块"><div class="tool-btn" @click="addCode"><el-icon><Monitor /></el-icon></div></el-tooltip>
        </div>

        <!-- 输入框 -->
        <textarea
          ref="contentInputRef"
          v-model="form.content"
          class="editor-textarea"
          placeholder="分享你的见解..."
        ></textarea>
      </div>
    </div>

    <!-- 图片上传大区域 -->
    <div class="form-group">
      <div class="form-label">图片</div>
      <div class="form-content">
         <el-upload
            class="upload-demo"
            drag
            action=""
            :http-request="handleImageUpload"
            :show-file-list="false"
            accept="image/*"
          >
             <div class="upload-area">
               <img v-if="form.coverImage" :src="form.coverImage" style="max-width: 100%; max-height: 200px; object-fit: contain;" />
               <div v-else>
                 <el-icon style="font-size: 40px; color: #ddd;"><Picture /></el-icon>
                 <div class="upload-text">点击或拖动图片到这里上传</div>
               </div>
            </div>
          </el-upload>
      </div>
    </div>

    <!-- Tag -->
    <div class="form-group">
      <div class="form-label">Tag</div>
      <div class="form-content">
         <el-input v-model="form.tags" placeholder="添加标签，多个标签用空格分隔" />
      </div>
    </div>

    <!-- 隐私设置 -->
    <div class="form-group center-aligned">
      <div class="form-label">隐私设置</div>
      <div class="form-content">
        <el-radio-group v-model="form.isPublic">
          <el-radio label="public">公开</el-radio>
          <el-radio label="private">私密</el-radio>
        </el-radio-group>
      </div>
    </div>

    <!-- 底部 -->
    <div class="footer-bar">
       <el-button type="danger" round class="submit-btn" @click="submitArticle" style="background-color: #ff9999; border-color: #ff9999;">加上去</el-button>
       <!-- <span class="tip-text">使用 Ctrl+Enter 或 Alt+S 快速提交 | BBCode指南</span> -->
    </div>

  </div>
</template>

<script setup>
import { Picture, Link, ChatLineSquare, Monitor, ArrowLeft } from '@element-plus/icons-vue'
import { useArticlePublishLogic } from './js/ArticlePublishLogic.js'

const {
  form, contentInputRef,
  addBold, addItalic, addUnderline, addStrike, addHeading, addQuote, addCode, addLink,
  handleImageUpload, submitArticle, goBack
} = useArticlePublishLogic()

</script>

<style scoped>
@import './css/ArticlePublish.css';
</style>
