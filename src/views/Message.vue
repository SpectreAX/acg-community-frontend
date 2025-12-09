<template>
  <div class="message-container">
    <div class="chat-layout">
      <!-- Sidebar -->
      <div class="chat-sidebar">
        <div class="sidebar-header">
           <el-button @click="$router.back()" :icon="Back" circle />
           <span style="margin-left: 10px; font-weight: bold;">消息列表</span>
        </div>
        <div class="conversation-list">
           <div 
             v-for="conv in conversationList" 
             :key="conv.userId" 
             class="conversation-item" 
             :class="{ active: targetUserId == conv.userId }"
             @click="openConversation(conv.userId)">
             <div class="avatar-wrapper">
                <el-avatar :size="40" :src="conv.avatar || defaultAvatar" />
                <span v-if="conv.unreadCount > 0" class="unread-badge">{{ conv.unreadCount }}</span>
             </div>
             <div class="conv-info">
               <div class="conv-row">
                 <div class="conv-name">{{ conv.nickname }}</div>
                 <div class="conv-time">{{ formatTimeShort(conv.lastMessageTime) }}</div>
               </div>
               <div class="conv-last-msg">{{ getPreview(conv) }}</div>
             </div>
           </div>
           <el-empty v-if="conversationList.length === 0" description="暂无消息" :image-size="60"></el-empty>
        </div>
      </div>

      <!-- Main Chat Area -->
      <div class="chat-main">
        <template v-if="targetUserId">
             <div class="chat-header">
                <span class="chat-title">{{ targetUser.nickname }}</span>
             </div>
             
             <div class="message-list" ref="messageListRef">
                 <div v-for="msg in messageList" :key="msg.id" 
                      class="message-item" 
                      :class="msg.senderId === currentUser.id ? 'self' : 'other'">
                      <el-avatar v-if="msg.senderId !== currentUser.id" :size="36" :src="targetUser.avatar || defaultAvatar" class="msg-avatar" @click="$router.push('/user/' + targetUser.id)" style="cursor: pointer"/>
                      <div class="message-content-wrapper">
                         <!-- Text Message -->
                         <div v-if="msg.type === 0 || !msg.type" class="message-content">{{ msg.content }}</div>
                         <!-- Image Message -->
                         <div v-else-if="msg.type === 1" class="message-image">
                            <el-image 
                              :src="msg.content" 
                              :preview-src-list="[msg.content]"
                              fit="cover"
                              style="max-width: 200px; border-radius: 4px;"
                            />
                         </div>
                         <div class="message-time">{{ formatTime(msg.createTime) }}</div>
                      </div>
                      <el-avatar v-if="msg.senderId === currentUser.id" :size="36" :src="currentUser.avatar || defaultAvatar" class="msg-avatar" />
                 </div>
             </div>
    
             <div class="chat-input-area">
                <!-- Toolbar -->
                <div class="input-toolbar">
                   <el-popover placement="top-start" :width="300" trigger="click">
                      <template #reference>
                        <el-button circle size="small" title="表情">
                          <template #icon>
                             <el-icon>
                                <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em">
                                   <path fill="currentColor" d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z"></path>
                                   <path fill="currentColor" d="M288 421a48 48 0 1 0 96 0 48 48 0 1 0-96 0zm352 0a48 48 0 1 0 96 0 48 48 0 1 0-96 0z"></path>
                                   <path fill="currentColor" d="M512 736c-88.4 0-160-71.6-160-160h320c0 88.4-71.6 160-160 160z"></path>
                                </svg>
                             </el-icon>
                          </template>
                        </el-button>
                      </template>
                      <div class="emoji-grid">
                         <span v-for="emoji in emojiList" :key="emoji" class="emoji-item" @click="addEmoji(emoji)">
                            {{ emoji }}
                         </span>
                      </div>
                   </el-popover>
                   
                   <el-button :icon="Picture" circle size="small" title="图片" @click="triggerFileUpload" />
                   <input type="file" ref="fileInput" style="display: none" accept="image/*" @change="handleFileChange" />
                </div>
    
                <el-input 
                  v-model="messageContent" 
                  type="textarea" 
                  :rows="3"
                  placeholder="输入消息..." 
                  resize="none"
                  @keyup.enter.ctrl="sendMessage"
                  class="chat-textarea"
                />
                <div class="input-actions">
                   <span class="tip">Ctrl + Enter 发送</span>
                   <el-button type="primary" @click="sendMessage">发送</el-button>
                </div>
             </div>
        </template>
        <template v-else>
             <div class="empty-chat-placeholder">
                 <el-empty description="请选择一个会话开始聊天" />
             </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue' // Added watch
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { Back, Picture } from '@element-plus/icons-vue'
import SockJS from 'sockjs-client'
import { Client } from '@stomp/stompjs'

const route = useRoute()
const router = useRouter()
const targetUserId = ref(route.params.userId) // Make reactive to route changes
const currentUser = JSON.parse(localStorage.getItem('user') || '{}')

const targetUser = ref({})
const conversationList = ref([]) // This now holds the list of conversations (users)
const messageList = ref([]) // This holds the messages of the *current* conversation
const messageContent = ref('')
const messageListRef = ref(null)
const defaultAvatar = 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png'
const fileInput = ref(null)
const stompClient = ref(null)
const reconnectAttempts = ref(0)
const maxReconnectAttempts = 5

const emojiList = [
  '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇',
  '🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚',
  '😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩',
  '🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣',
  '😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬',
  '🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗',
  '🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯',
  '😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐',
  '🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈',
  '👿','👹','👺','🤡','💩','👻','💀','☠️','👽','👾',
  '🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿',
  '😾','👋','🤚','🖐','✋','🖖','👌','🤏','✌️','🤞',
  '🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍',
  '👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝',
  '🙏','✍️','💅','🤳','💪','🦾','🦵','🦿','🦶','👣',
  '👂','🦻','👃','🧠','🦷','👀','👁','👅','👄'
]

// Fetch conversation list
const loadConversationList = () => {
    axios.get(`/api/message/conversations?userId=${currentUser.id}`).then(res => {
        if (res.data) {
            conversationList.value = res.data
        }
    })
}

// Load target user info
const loadTargetUser = () => {
    if (!targetUserId.value) return
    axios.get(`/api/user/${targetUserId.value}`).then(res => {
        if(res.data.code === '200') {
            targetUser.value = res.data.data
        }
    })
}

// Load messages for current chat
const loadMessages = () => {
    if (!targetUserId.value) return
    axios.get(`/api/message/conversation/${targetUserId.value}?myId=${currentUser.id}`).then(res => {
      messageList.value = res.data
      nextTick(() => {
        scrollToBottom()
      })
    })
}

// Switch conversation
const openConversation = (userId) => {
    router.push(`/message/${userId}`)
}

// Connect to WebSocket
const connectWebSocket = () => {
    console.log('[WebSocket] Attempting to connect...', {
        currentUserId: currentUser.id
    })
    
    // Use full URL to avoid proxy issues during development if needed, but relative path is better for production
    const socket = new SockJS('/api/ws')
    // const socket = new SockJS('http://localhost:8080/api/ws') 
    
    stompClient.value = new Client({
        webSocketFactory: () => socket,
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        // debug: (str) => console.log(str),
        onConnect: () => {
            console.log('[WebSocket] ✅ Connected successfully!')
            reconnectAttempts.value = 0
            
            const subscriptionPath = `/queue/messages/${currentUser.id}`
            
            stompClient.value.subscribe(subscriptionPath, (message) => {
                const newMessage = JSON.parse(message.body)
                console.log('[WebSocket] 📨 Received message:', newMessage)
                
                // If it belongs to current open chat, append it
                if (targetUserId.value && (newMessage.senderId == targetUserId.value || newMessage.receiverId == targetUserId.value)) {
                    messageList.value.push(newMessage)
                    nextTick(() => scrollToBottom())
                }
                
                // Refresh conversation list to show new message / unread count / reorder
                loadConversationList()
            })
        },
        onStompError: (frame) => {
            console.error('[WebSocket] ❌ STOMP error:', frame)
        },
        onWebSocketClose: () => {
             // Reconnection logic handled by ReconnectDelay
        }
    })
    
    stompClient.value.activate()
}

const sendMessage = () => {
    if (!messageContent.value.trim()) return
    doSendMessage(messageContent.value, 0)
}

const doSendMessage = (content, type) => {
    if (!targetUserId.value) return
    axios.post('/api/message/send', {
      senderId: currentUser.id,
      receiverId: targetUserId.value,
      content: content,
      type: type 
    }).then(res => {
      // Assuming backend now returns Result object: { code: "200", msg: "...", data: ... }
      if (res.data.code === '200') {
        if (type === 0) messageContent.value = ''
        loadMessages() // Reload messages to ensure consistency
        loadConversationList() // Update sidebar
      } else {
        ElMessage.error(res.data.msg || '发送失败')
      }
    })
}

const addEmoji = (emoji) => {
    messageContent.value += emoji
}

const triggerFileUpload = () => {
    fileInput.value.click()
}

const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const formData = new FormData()
    formData.append('file', file)
    
    axios.post('/api/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    }).then(res => {
        if (res.data.code === 200) {
            doSendMessage(res.data.url, 1)
        } else {
            ElMessage.error('图片上传失败: ' + res.data.msg)
        }
    }).catch(err => {
        ElMessage.error('图片上传出错')
        console.error(err)
    })
}

const scrollToBottom = () => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
}

const formatTime = (timeStr) => {
    if (!timeStr) return ''
    const date = new Date(timeStr)
    return date.toLocaleString()
}

const formatTimeShort = (timeStr) => {
    if (!timeStr) return ''
    const date = new Date(timeStr)
    const now = new Date()
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString()
}

const getPreview = (conv) => {
    if (conv.lastMessageType === 1) return '[图片]'
    return conv.lastMessage || '...'
}

onMounted(() => {
    if(!currentUser.id) {
        ElMessage.warning('请先登录')
        router.push('/login')
        return
    }
    
    loadConversationList()
    
    if (targetUserId.value) {
        loadTargetUser()
        loadMessages()
    }
    
    connectWebSocket()
})

onUnmounted(() => {
    if (stompClient.value) {
        stompClient.value.deactivate()
        stompClient.value = null
    }
})

// Watch for route changes to switch chats without reloading component
watch(() => route.params.userId, (newId) => {
    targetUserId.value = newId
    if (newId) {
        loadTargetUser()
        loadMessages()
    } else {
        targetUser.value = {}
        messageList.value = []
    }
})
</script>

<style scoped>
.message-container {
    max-width: 1200px;
    margin: 20px auto;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    height: calc(100vh - 100px);
    overflow: hidden;
    display: flex;
}

.chat-layout {
    display: flex;
    width: 100%;
    height: 100%;
}

.chat-sidebar {
    width: 280px;
    border-right: 1px solid #eee;
    background: #fcfcfc;
    display: flex;
    flex-direction: column;
}

.sidebar-header {
    padding: 15px;
    border-bottom: 1px solid #eee;
    display: flex;
    align-items: center;
    background: #f9f9f9;
}

.conversation-list {
    flex: 1;
    overflow-y: auto;
}

.conversation-item {
    padding: 12px 15px;
    display: flex;
    align-items: center;
    cursor: pointer;
    border-bottom: 1px solid #f5f5f5;
    transition: background 0.2s;
}

.conversation-item:hover {
    background: #f0f0f0;
}

.conversation-item.active {
    background: #e6f1fc;
}

.avatar-wrapper {
    position: relative;
    margin-right: 10px;
}

.unread-badge {
    position: absolute;
    top: -2px;
    right: -2px;
    background: #f56c6c;
    color: #fff;
    font-size: 10px;
    padding: 0 4px;
    border-radius: 10px;
    min-width: 14px;
    line-height: 14px;
    text-align: center;
    border: 1px solid #fff;
}

.conv-info {
    flex: 1;
    overflow: hidden;
}

.conv-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
    align-items: baseline;
}

.conv-name {
    font-weight: bold;
    font-size: 14px;
    color: #333;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 140px;
}

.conv-time {
    font-size: 11px;
    color: #bbb;
}

.conv-last-msg {
    color: #999;
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.chat-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: #fff;
}

.chat-header {
    padding: 15px 20px;
    border-bottom: 1px solid #eee;
    font-size: 16px;
    font-weight: bold;
    background: #f9f9f9;
}

.message-list {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    background: #f5f7fa;
}

.message-item {
    margin-bottom: 20px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
}

.message-item.self {
    justify-content: flex-end;
}

.message-content-wrapper {
    display: flex;
    flex-direction: column;
    max-width: 60%;
    align-items: flex-start;
}

.message-item.self .message-content-wrapper {
    align-items: flex-end;
}

.message-content {
    padding: 10px 15px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    font-size: 14px;
    line-height: 1.5;
    word-break: break-all;
}

.message-image {
    background: transparent;
    border-radius: 4px;
    overflow: hidden;
}

.message-item.self .message-content {
    background: #409eff;
    color: #fff;
}

.message-time {
    font-size: 12px;
    color: #bbb;
    margin-top: 5px;
}

.chat-input-area {
    padding: 10px 20px 20px;
    border-top: 1px solid #eee;
    background: #fff;
    display: flex;
    flex-direction: column;
}

.input-toolbar {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
}

.emoji-grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 5px;
    max-height: 200px;
    overflow-y: auto;
}

.emoji-item {
    cursor: pointer;
    font-size: 20px;
    text-align: center;
    padding: 4px;
    border-radius: 4px;
}

.emoji-item:hover {
    background-color: #f0f0f0;
}

.input-actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    margin-top: 10px;
    gap: 10px;
}

.tip {
    font-size: 12px;
    color: #999;
}

.chat-textarea :deep(.el-textarea__inner) {
    border: none;
    box-shadow: none;
    background: #f9f9f9;
    padding: 10px;
}
.chat-textarea :deep(.el-textarea__inner):focus {
    box-shadow: 0 0 0 1px #dcdfe6;
    background: #fff;
}

.empty-chat-placeholder {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5f7fa;
}
</style>
