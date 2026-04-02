import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { UserInfo } from '@/types'
import { getToken, setToken, removeToken } from '@/utils/auth'
import { login as mockLogin } from '@/api/auth'

const USER_KEY = 'intern-admin-user'

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
      userInfo.value = JSON.parse(savedUser)
    } catch {
      // 如果解析失败，使用默认值
    }
  }

  const isLoggedIn = computed(() => Boolean(token.value))

  /**
   * 登录
   */
  async function login(username: string, password: string) {
    try {
      const response = await mockLogin({ username, password })

      // 保存 token 和用户信息
      token.value = response.token
      setToken(response.token)

      userInfo.value = {
        id: response.userInfo.id,
        username: response.userInfo.username,
        name: response.userInfo.nickname,
        nickname: response.userInfo.nickname,
        role: response.userInfo.role
      }
      localStorage.setItem(USER_KEY, JSON.stringify(userInfo.value))

      return response
    } catch (error) {
      throw error
    }
  }

  /**
   * 退出登录
   */
  function logout() {
    token.value = ''
    removeToken()
    userInfo.value = {
      name: '',
      role: '前端求职者'
    }
    localStorage.removeItem(USER_KEY)
  }

  /**
   * 当接收到 401 时清空登录状态
   */
  function clearToken() {
    token.value = ''
    removeToken()
  }

  /**
   * 设置 token（外部使用）
   */
  function setTokenAndPersist(newToken: string) {
    token.value = newToken
    setToken(newToken)
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    login,
    logout,
    clearToken,
    setTokenAndPersist
  }
})
