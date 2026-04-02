/**
 * Token 持久化管理
 */

const TOKEN_KEY = 'intern-admin-token'

/**
 * 从本地存储获取 token
 */
export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || ''
}

/**
 * 将 token 保存到本地存储
 */
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

/**
 * 从本地存储删除 token
 */
export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * 检查是否存在有效的 token
 */
export function hasToken(): boolean {
  return !!getToken()
}
