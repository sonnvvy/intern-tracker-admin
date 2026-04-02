# 前端登录系统实现完整指南

## 📦 项目文件清单

### 1. 新创建的文件

#### `src/utils/auth.ts` - Token 管理工具
```
功能：
- getToken() - 获取 localStorage 中的 token
- setToken(token) - 保存 token 到 localStorage  
- removeToken() - 删除 token
- hasToken() - 检查是否存在 token
```

#### `src/api/auth.ts` - Mock 登录接口
```
功能：
- login(username, password) - 模拟登录请求
  - 预置账号：admin / 123456
  - 返回 token 和用户信息
  - 模拟 500ms 网络延迟
```

### 2. 修改的文件

#### `src/types/index.ts` - 类型定义
- 扩展 `UserInfo` 接口，添加 id、username、nickname 等字段

#### `src/stores/user.ts` - Pinia 用户 Store
```
新增\改造的方法：
- login(username, password) - 真实登录逻辑，调用 mock 接口
- logout() - 清空所有登录状态
- clearToken() - 当接收到 401 时调用
- setTokenAndPersist(token) - 外部设置 token

特性：
- token 从 localStorage 初始化（页面刷新保持登录）
- 用户信息也持久化到 localStorage
- 登录失败时抛出错误，由页面处理
```

#### `src/api/ai.ts` - Axios 请求拦截器
```
新增功能：
- 请求拦截器：自动在请求头加 Authorization: Bearer {token}
- 响应拦截器：
  - 收到 401 状态码时，自动清空登录状态
  - 自动跳转到登录页面
```

#### `src/router/index.ts` - 路由守卫
```
新增功能：
- 白名单机制：/login 无需登录可访问
- 未登录访问其他页面 -> 重定向到 /login
- 已登录访问 /login -> 重定向到 /dashboard
- getRedirectPath() - 获取登录后应该重定向的原始页面
- 使用 sessionStorage 保存"原始要访问的页面"
```

#### `src/views/login/index.vue` - 登录页面
```
功能：
- Element Plus 表单设计
- 用户名、密码输入框
- 显示/隐藏密码按钮
- 登录按钮 loading 状态
- 表单验证（非空、最小长度）
- 登录失败错误提示
- 演示账号提示框
- 梯度背景、响应式设计
- 回车键快捷登录
```

#### `src/layout/index.vue` - 主布局（已存在）
```
已有内容：
- 退出登录按钮（右上角）
- handleLogout() 方法调用 userStore.logout() 和跳转
```

## 🔄 登录流程

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 未登录用户访问首页                                         │
│    ↓                                                          │
│ 2. 路由守卫检查 isLoggedIn                                    │
│    ↓                                                          │
│ 3. 重定向到 /login 页面                                       │
│    ↓                                                          │
│ 4. 用户输入用户名、密码，点击登录                             │
│    ↓                                                          │
│ 5. 登录页面调用 userStore.login()                             │
│    ↓                                                          │
│ 6. userStore 调用 api/auth.ts 的 login() 函数               │
│    ↓                                                          │
│ 7. 验证通过，返回 token 和 userInfo                           │
│    ↓                                                          │
│ 8. userStore 保存 token 和 userInfo 到 localStorage        │
│    ↓                                                          │
│ 9. 登录页面获取原始要访问的页面地址（或默认首页）             │
│    ↓                                                          │
│ 10. router.push() 重定向                                     │
│    ↓                                                          │
│ 11. 路由守卫检查 isLoggedIn 通过                              │
│    ↓                                                          │
│ 12. 页面加载成功，显示用户信息                                │
└─────────────────────────────────────────────────────────────┘
```

## 📝 页面刷新后保持登录状态

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 用户登录后，token 存在 localStorage                       │
│    ↓                                                          │
│ 2. 用户刷新页面                                               │
│    ↓                                                          │
│ 3. 页面重新加载，Pinia store 初始化                          │
│    ↓                                                          │
│ 4. useUserStore() 在初始化时执行：                           │
│    const token = getToken() // 从 localStorage 读取         │
│    ↓                                                          │
│ 5. token 存在，isLoggedIn 为 true                            │
│    ↓                                                          │
│ 6. 路由守卫检查通过，页面正常显示                             │
│    ↓                                                          │
│ 7. 用户仍处于登录状态 ✓                                      │
└─────────────────────────────────────────────────────────────┘
```

## 🔐 接收 401 后的处理

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 前端发起请求                                               │
│    ↓                                                          │
│ 2. Axios 请求拦截器添加 Authorization header                │
│    ↓                                                          │
│ 3. 后端返回 401 Unauthorized                                 │
│    ↓                                                          │
│ 4. Axios 响应拦截器捕获 401                                  │
│    ↓                                                          │
│ 5. 调用 userStore.clearToken()                               │
│    ↓                                                          │
│ 6. router.push('/login')                                    │
│    ↓                                                          │
│ 7. 用户回到登录页，需要重新登录                               │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 测试步骤

1. **启动项目**
   ```bash
   npm run dev
   ```

2. **访问首页**
   - 浏览器打开 `http://localhost:5173`
   - 应该自动重定向到 `/login`

3. **测试登录失败**
   - 用户名输入：`test`
   - 密码输入：`123456`
   - 点击登录，应显示 "用户名或密码错误"

4. **测试正确登录**
   - 用户名：`admin`
   - 密码：`123456`
   - 点击登录，应成功进入首页

5. **测试页面刷新**
   - 登录成功后，刷新页面
   - 应该仍然保持登录状态（不跳转到登录页）

6. **测试退出登录**
   - 点击右上角"退出登录"按钮
   - 应该跳转到登录页，localStorage 中 token 被清空

7. **测试显示/隐藏密码**
   - 在密码输入框中输入内容
   - 点击右侧图标切换显示/隐藏

8. **测试回车快捷登录**
   - 在密码框中按 Enter 键
   - 应该触发登录流程

## 📱 响应式设计支持

- ✅ 桌面端（≥ 768px）：正常显示 400px 宽的登录表单
- ✅ 平板端（< 768px）：表单宽度自适应，padding 减少
- ✅ 手机端（< 480px）：表单更紧凑，字体更小

## 🔑 演示账号

| 字段 | 值 |
|---|---|
| 用户名 | `admin` |
| 密码 | `123456` |

## 💡 后续替换真实后端

只需修改 `src/api/auth.ts` 中的 `login()` 函数：

```typescript
// 现有 mock 实现
export async function login(req: LoginRequest): Promise<LoginResponse> {
  // 模拟异步请求
  await new Promise(resolve => setTimeout(resolve, 500))
  // ... 账号验证 ...
  return { token, userInfo }
}

// 改为真实后端调用
import axios from 'axios'

export async function login(req: LoginRequest): Promise<LoginResponse> {
  const response = await axios.post('/api/auth/login', req)
  return response.data
}
```

其他所有代码无需修改！基于接口的设计支持平滑切换。

## 📚 核心特性检查表

- ✅ Mock 登录接口，模拟异步网络延迟
- ✅ Token 作为登录态标识，存储在 localStorage
- ✅ 页面刷新后保持登录状态
- ✅ 使用 Pinia 管理用户信息和登录状态
- ✅ Axios 请求自动附加 token
- ✅ 401 响应自动清空登录状态
- ✅ Vue Router 路由守卫拦截未登录页面
- ✅ 登录成功后跳转到原始要访问的页面（或首页）
- ✅ 退出登录功能完整实现
- ✅ 登录页面美观、响应式
- ✅ 表单验证、错误提示
- ✅ 显示/隐藏密码功能
