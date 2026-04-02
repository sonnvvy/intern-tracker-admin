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

interface MockAccount {
  id: string
  username: string
  password: string
  nickname: string
  role: string
}

const MOCK_ACCOUNTS: MockAccount[] = [
  {
    id: '1',
    username: 'admin',
    password: '123456',
    nickname: '管理员',
    role: '前端求职者'
  },
  {
    id: '2',
    username: 'member',
    password: '123456',
    nickname: '普通用户',
    role: '前端求职者'
  }
]

/**
 * 模拟登录接口
 * 预设账号：
 * admin / 123456（测试账号，可见性能测试页）
 * member / 123456（普通账号，不展示性能测试页）
 */
export async function login(req: LoginRequest): Promise<LoginResponse> {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 500))

  const { username, password } = req

  const account = MOCK_ACCOUNTS.find(item => item.username === username && item.password === password)

  // 验证账号密码
  if (!account) {
    throw new Error('用户名或密码错误')
  }

  // 返回登录成功响应
  return {
    token: `token_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    userInfo: {
      id: account.id,
      username: account.username,
      nickname: account.nickname,
      role: account.role
    }
  }
}
