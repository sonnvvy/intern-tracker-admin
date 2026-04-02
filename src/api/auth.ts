/**
 * Mock 登录接口
 * 模拟真实登录流程，便于后续切换到真实后端
 */

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  userInfo: {
    id: string
    username: string
    nickname: string
    role: string
  }
}

/**
 * 模拟登录接口
 * 预设账号：admin / 123456
 */
export async function login(req: LoginRequest): Promise<LoginResponse> {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 500))

  const { username, password } = req

  // 验证账号密码
  if (username !== 'admin' || password !== '123456') {
    throw new Error('用户名或密码错误')
  }

  // 返回登录成功响应
  return {
    token: `token_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    userInfo: {
      id: '1',
      username: 'admin',
      nickname: '管理员',
      role: '前端求职者'
    }
  }
}
