import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { UserInfo } from '@/types'

const TOKEN_KEY = 'intern-admin-token'
const USER_KEY = 'intern-admin-user'

export const useUserStore = defineStore('user', () => {
  const token = ref<string>(localStorage.getItem(TOKEN_KEY) || '')
  const userInfo = ref<UserInfo>(
    JSON.parse(localStorage.getItem(USER_KEY) || '{"name":"sonnvvy","role":"前端求职者"}')
  )

  const isLoggedIn = computed(() => Boolean(token.value))

  function login(username: string) {
    token.value = 'mock-token-2026'
    userInfo.value = {
      name: username,
      role: '前端求职者'
    }
    localStorage.setItem(TOKEN_KEY, token.value)
    localStorage.setItem(USER_KEY, JSON.stringify(userInfo.value))
  }

  function logout() {
    token.value = ''
    localStorage.removeItem(TOKEN_KEY)
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    login,
    logout
  }
})
