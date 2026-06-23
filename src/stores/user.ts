import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { UserInfo } from '@/types'
import { getToken, setToken, removeToken } from '@/utils/auth'
import { login as apiLogin, logout as apiLogout } from '@/api/auth'

const USER_KEY = 'user'
const PERFORMANCE_TEST_USERS = ['admin']

export const useUserStore = defineStore('user', () => {
  const token = ref<string>(getToken())
  const userInfo = ref<UserInfo>({
    name: '',
    role: '前端求职者'
  })

  // 从 localStorage 恢复用户信息
  const savedUser = localStorage.getItem(USER_KEY)
  if (savedUser) {
    try {
      const parsedUser = JSON.parse(savedUser) as Partial<UserInfo> & { email?: string }
      const username = parsedUser.email || parsedUser.username
      userInfo.value = {
        id: parsedUser.id ? String(parsedUser.id) : undefined,
        username,
        name: parsedUser.name || username || '',
        nickname: parsedUser.nickname || username,
        role: parsedUser.role || '前端求职者'
      }
    } catch {
      // 如果解析失败，使用默认值
    }
  }

  const isLoggedIn = computed(() => Boolean(token.value))
  const canAccessPerformancePage = computed(() => {
    const username = userInfo.value.username ?? ''
    return PERFORMANCE_TEST_USERS.includes(username)
  })

  /**
   * 登录
   */
  async function login(username: string, password: string) {
    const { session, user } = await apiLogin({ username, password })

    if (!session || !user) {
      throw new Error('未获取到有效登录会话，请先确认邮箱后重试')
    }

    token.value = session.access_token
    setToken(session.access_token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))

    const email = user.email || username
    userInfo.value = {
      id: user.id,
      username: email,
      name: email,
      nickname: email,
      role: '前端求职者'
    }

    return { session, user }
  }

  /**
   * 退出登录
   */
  async function logout() {
    try {
      await apiLogout()
    } finally {
      token.value = ''
      removeToken()
      userInfo.value = {
        name: '',
        role: '前端求职者'
      }
      localStorage.removeItem(USER_KEY)
    }
  }

  /**
   * 当接收到 401 时清空登录状态
   */
  function clearToken() {
    token.value = ''
    removeToken()
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  /**
   * 设置 token（外部使用）
   */
  function setTokenAndPersist(newToken: string) {
    token.value = newToken
    setToken(newToken)
    localStorage.setItem('token', newToken)
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    canAccessPerformancePage,
    login,
    logout,
    clearToken,
    setTokenAndPersist
  }
})
