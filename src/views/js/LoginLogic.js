import { ref, reactive, watch, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { ElMessage } from 'element-plus'

export function useLoginLogic() {
  const router = useRouter()
  const isRegister = ref(false)
  let turnstileWidgetId = null

  const form = reactive({
    username: '',
    password: '',
    nickname: ''
  })

  // 渲染 Turnstile widget (with retry mechanism)
  const renderTurnstile = (retries = 5, delay = 100) => {
    // 等待 DOM 更新
    nextTick(() => {
      const container = document.getElementById('turnstile-container')

      if (!container) {
        // Container not ready, retry
        if (retries > 0) {
          console.log('turnstile-container not ready, retrying in', delay, 'ms...')
          setTimeout(() => renderTurnstile(retries - 1, delay * 2), delay)
        } else {
          console.error('turnstile-container not found after retries')
        }
        return
      }

      if (!window.turnstile) {
        // Turnstile API not loaded, retry
        if (retries > 0) {
          console.log('window.turnstile not ready, retrying in', delay, 'ms...')
          setTimeout(() => renderTurnstile(retries - 1, delay * 2), delay)
        } else {
          console.error('window.turnstile not found after retries')
        }
        return
      }

      // Both container and API are ready, render widget
      // 如果已经有 widget，先移除
      if (turnstileWidgetId !== null) {
        try {
          window.turnstile.remove(turnstileWidgetId)
        } catch (e) {
          console.log('Widget already removed:', e)
        }
        turnstileWidgetId = null
      }

      // 渲染新的 widget
      try {
        turnstileWidgetId = window.turnstile.render('#turnstile-container', {
          sitekey: '0x4AAAAAACFhu2FXiX7f9Cj_',
          theme: 'light',
          size: 'normal',
          callback: function (token) {
            console.log('Turnstile success! Token:', token)
          },
          'error-callback': function (error) {
            console.error('Turnstile error:', error)
          }
        })
        console.log('✅ Turnstile widget rendered successfully with ID:', turnstileWidgetId)
      } catch (error) {
        console.error('❌ Failed to render Turnstile:', error)
      }
    })
  }

  // 页面加载完成后渲染 widget
  onMounted(() => {
    renderTurnstile()
  })

  // 监听注册模式切换 - 不再需要销毁 widget，因为登录注册都需要
  watch(isRegister, () => {
    // 切换模式时重新渲染或保持原样？
    // Cloudflare widget 不需要重新渲染，只要 container 在就行
    // 但如果 DOM 结构变化导致 container 重建，则需重新渲染。
    // 在 Login.vue 中，v-if="isRegister" 被移除了，container 一直存在。
    // 所以这里其实什么都不用做，或者为了保险起见检查一下
    nextTick(() => {
      const container = document.getElementById('turnstile-container')
      if (container && !container.hasChildNodes()) {
        renderTurnstile()
      }
    })
  })

  const handleSubmit = () => {
    if (!form.username || !form.password) {
      ElMessage.warning('请输入用户名和密码')
      return
    }

    if (isRegister.value) {
      // 注册逻辑
      if (!form.nickname) {
        ElMessage.warning('注册需要填写昵称')
        return
      }

      // 获取 Turnstile token
      const turnstileToken = document.querySelector('[name="cf-turnstile-response"]')?.value
      if (!turnstileToken) {
        ElMessage.warning('请完成人机验证')
        return
      }

      // 发送注册请求，包含 Turnstile token
      axios.post('/api/user/register', {
        ...form,
        turnstileToken
      }).then(res => {
        if (res.data.code === '200') {
          ElMessage.success('注册成功，请直接登录')
          isRegister.value = false
        } else {
          ElMessage.error(res.data.msg)
        }
      })


    } else {
      // 登录逻辑

      // 获取 Turnstile token
      const turnstileToken = document.querySelector('[name="cf-turnstile-response"]')?.value
      if (!turnstileToken) {
        ElMessage.warning('请完成人机验证')
        return
      }

      axios.post('/api/user/login', {
        ...form,
        turnstileToken
      }).then(res => {
        if (res.data.code === '200' || res.data.code === 200) {
          ElMessage.success('登录成功')
          localStorage.setItem('user', JSON.stringify(res.data.data))
          router.push('/')
        } else {
          ElMessage.error(res.data.msg)
          // 登录失败刷新验证码
          if (window.turnstile) {
            window.turnstile.reset()
          }
        }
      })
    }
  }

  return {
    router,
    isRegister,
    form,
    handleSubmit
  }
}