<template>
  <div class="chatbot-container">
    <!-- 浮动聊天按钮 -->
    <transition name="fade">
      <button 
        v-if="!isOpen" 
        class="chat-button" 
        @click="toggleChat"
        aria-label="打开聊天"
      >
        <el-icon :size="28"><ChatDotRound /></el-icon>
      </button>
    </transition>

    <!-- 聊天对话框 -->
    <transition name="slide-up">
      <div v-if="isOpen" class="chat-dialog">
        <!-- 对话框头部 -->
        <div class="chat-header">
          <div class="header-title">
            <el-icon :size="20"><Star /></el-icon>
            <span>动漫推荐助手</span>
          </div>
          <div class="header-actions">
            <el-popconfirm
              title="确定要清空所有聊天记录吗？"
              confirm-button-text="确定"
              cancel-button-text="取消"
              :width="200"
              @confirm="clearChat"
            >
              <template #reference>
                <button class="action-btn" aria-label="清空聊天" title="清空聊天记录">
                  <el-icon :size="18"><Delete /></el-icon>
                </button>
              </template>
            </el-popconfirm>
            <button class="close-btn" @click="toggleChat" aria-label="关闭聊天">
              <el-icon :size="20"><Close /></el-icon>
            </button>
          </div>
        </div>

        <!-- 消息列表 -->
        <div class="chat-messages" ref="messagesContainer">
          <div 
            v-for="(msg, index) in messages" 
            :key="index" 
            :class="['message', msg.role === 'user' ? 'user-message' : 'ai-message']"
          >
            <div class="message-avatar">
              <el-icon :size="20">
                <User v-if="msg.role === 'user'" />
                <ChatLineRound v-else />
              </el-icon>
            </div>
            <div class="message-content">
              <div 
                v-if="msg.role === 'user'" 
                class="message-text"
              >
                {{ msg.content }}
              </div>
              <div 
                v-else 
                class="message-text markdown-content" 
                v-html="renderMarkdown(msg.content)"
              >
              </div>
            </div>
          </div>

          <!-- 加载中指示器 -->
          <div v-if="isLoading" class="message ai-message loading-message">
            <div class="message-avatar">
              <el-icon :size="20"><ChatLineRound /></el-icon>
            </div>
            <div class="message-content">
              <div class="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="chat-input">
          <el-input
            v-model="userInput"
            type="textarea"
            :autosize="{ minRows: 1, maxRows: 4 }"
            placeholder="询问动漫推荐..."
            @keydown.enter.exact.prevent="sendMessage"
            :disabled="isLoading"
          />
          <button 
            class="send-btn" 
            @click="sendMessage"
            :disabled="!userInput.trim() || isLoading"
          >
            <el-icon :size="20"><Promotion /></el-icon>
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, nextTick, watch, onMounted } from 'vue';
import { 
  ChatDotRound, 
  Close, 
  User, 
  ChatLineRound, 
  Promotion,
  Star,
  Delete
} from '@element-plus/icons-vue';
import { sendChatMessage } from '../utils/deepseek.js';
import { ElMessage } from 'element-plus';
import { marked } from 'marked';

const STORAGE_KEY = 'deepseek_chat_messages';

const isOpen = ref(false);
const isLoading = ref(false);
const userInput = ref('');
const messages = ref([]);
const messagesContainer = ref(null);

// 配置 marked
marked.setOptions({
  breaks: true,
  gfm: true
});

// 渲染 Markdown
const renderMarkdown = (content) => {
  return marked.parse(content);
};

// 从 localStorage 加载聊天记录
const loadMessages = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      messages.value = parsed;
    }
  } catch (error) {
    console.error('加载聊天记录失败:', error);
  }
};

// 保存聊天记录到 localStorage
const saveMessages = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.value));
  } catch (error) {
    console.error('保存聊天记录失败:', error);
  }
};

// 监听消息变化，自动保存
watch(messages, () => {
  saveMessages();
}, { deep: true });

// 组件挂载时加载历史记录
onMounted(() => {
  loadMessages();
});

// 切换聊天框显示/隐藏
const toggleChat = () => {
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    ElMessage.warning('请先登录后使用动漫推荐助手');
    return;
  }

  isOpen.value = !isOpen.value;
  if (isOpen.value && messages.value.length === 0) {
    // 首次打开时显示欢迎消息
    messages.value.push({
      role: 'assistant',
      content: '你好！我是你的动漫推荐助手 🎌 有什么想看的动漫类型吗？比如热血、治愈、恋爱等，我都可以为你推荐哦！'
    });
  }
};

// 清空聊天记录
const clearChat = () => {
  messages.value = [];
  localStorage.removeItem(STORAGE_KEY);
  ElMessage.success('聊天记录已清空');
};

// 发送消息
const sendMessage = async () => {
  if (!userInput.value.trim() || isLoading.value) return;

  const messageText = userInput.value.trim();
  userInput.value = '';

  // 添加用户消息到列表
  messages.value.push({
    role: 'user',
    content: messageText
  });

  // 滚动到底部
  await nextTick();
  scrollToBottom();

  // 设置加载状态
  isLoading.value = true;

  try {
    // 调用 API
    const reply = await sendChatMessage(messages.value);
    
    // 添加 AI 回复到列表
    messages.value.push({
      role: 'assistant',
      content: reply
    });

    // 滚动到底部
    await nextTick();
    scrollToBottom();
  } catch (error) {
    ElMessage.error('发送消息失败，请稍后重试');
    console.error('发送消息失败:', error);
  } finally {
    isLoading.value = false;
  }
};

// 滚动到消息列表底部
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};
</script>

<style scoped>
.chatbot-container {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 1000;
}

/* 浮动聊天按钮 */
.chat-button {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.chat-button:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 30px rgba(102, 126, 234, 0.6);
}

.chat-button:active {
  transform: scale(0.95);
}

/* 聊天对话框 */
.chat-dialog {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 380px;
  height: 550px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 对话框头部 */
.chat-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  min-width: 32px;
  min-height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.3s;
  padding: 0;
  flex-shrink: 0;
}

.action-btn .el-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.close-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  min-width: 32px;
  min-height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.3s;
  padding: 0;
  flex-shrink: 0;
}

.close-btn .el-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 消息列表 */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f7f8fc;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

/* 消息样式 */
.message {
  display: flex;
  gap: 12px;
  animation: fadeIn 0.3s ease;
}

.user-message {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-message .message-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.ai-message .message-avatar {
  background: #e2e8f0;
  color: #667eea;
}

.message-content {
  max-width: 70%;
}

.message-text {
  padding: 12px 16px;
  border-radius: 12px;
  line-height: 1.5;
  word-wrap: break-word;
}

.user-message .message-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom-right-radius: 4px;
}

.ai-message .message-text {
  background: white;
  color: #2d3748;
  border-bottom-left-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

/* Markdown 样式 */
.markdown-content :deep(p) {
  margin: 0.5em 0;
}

.markdown-content :deep(p:first-child) {
  margin-top: 0;
}

.markdown-content :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-content :deep(code) {
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
  color: #e74c3c;
}

.markdown-content :deep(pre) {
  background: #1e293b;
  color: #f8f8f2;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 0.5em 0;
}

.markdown-content :deep(pre code) {
  background: transparent;
  padding: 0;
  color: inherit;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 0.5em 0;
  padding-left: 1.5em;
}

.markdown-content :deep(li) {
  margin: 0.25em 0;
}

.markdown-content :deep(strong) {
  font-weight: 600;
  color: #1a202c;
}

.markdown-content :deep(em) {
  font-style: italic;
}

.markdown-content :deep(blockquote) {
  border-left: 3px solid #667eea;
  padding-left: 12px;
  margin: 0.5em 0;
  color: #4a5568;
}

.markdown-content :deep(a) {
  color: #667eea;
  text-decoration: none;
}

.markdown-content :deep(a:hover) {
  text-decoration: underline;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4) {
  margin: 0.75em 0 0.5em 0;
  font-weight: 600;
  color: #1a202c;
}

.markdown-content :deep(h1) { font-size: 1.5em; }
.markdown-content :deep(h2) { font-size: 1.3em; }
.markdown-content :deep(h3) { font-size: 1.1em; }
.markdown-content :deep(h4) { font-size: 1em; }

/* 加载动画 */
.loading-dots {
  display: flex;
  gap: 6px;
  padding: 12px 16px;
  background: white;
  border-radius: 12px;
  border-bottom-left-radius: 4px;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #cbd5e0;
  animation: bounce 1.4s infinite ease-in-out both;
}

.loading-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

/* 输入区域 */
.chat-input {
  padding: 16px 20px;
  background: white;
  border-top: 1px solid #e2e8f0;
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.chat-input :deep(.el-textarea) {
  flex: 1;
}

.chat-input :deep(.el-textarea__inner) {
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 10px 12px;
  font-size: 14px;
  resize: none;
  min-height: 44px !important;
  line-height: 1.5;
}

.chat-input :deep(.el-textarea__inner):focus {
  border-color: #667eea;
}

.send-btn {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.send-btn:active:not(:disabled) {
  transform: translateY(0);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

/* 过渡动画 - 浮动按钮 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: scale(0.8);
}

.fade-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* 响应式设计 */
@media (max-width: 480px) {
  .chat-dialog {
    width: calc(100vw - 40px);
    height: calc(100vh - 100px);
  }
  
  .chatbot-container {
    bottom: 20px;
    right: 20px;
  }
}
</style>
