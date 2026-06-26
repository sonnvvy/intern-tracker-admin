<template>
  <div class="login-container">
    <div class="login-form-wrapper">
      <div class="login-header">
        <h1 class="app-title">求职进度台</h1>
        <p class="subtitle">{{ isRegisterMode ? '仅支持使用邮箱创建账号' : '请使用注册邮箱和密码登录' }}</p>
      </div>

      <el-alert
        v-if="isRegisterMode"
        class="auth-tip"
        title="当前仅支持邮箱注册；注册后可能需要前往邮箱完成验证，验证后才能登录。"
        type="info"
        :closable="false"
        show-icon
      />

      <el-form
        v-if="!isRegisterMode"
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
        @keyup.enter="handleLogin"
      >
        <el-form-item prop="username">
          <el-input v-model.trim="loginForm.username" placeholder="请输入注册邮箱" autocomplete="email" inputmode="email" :disabled="loading" clearable size="large" @update:model-value="clearError">
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="密码"
            autocomplete="current-password"
            :disabled="loading"
            clearable
            size="large"
            @update:model-value="clearError"
          >
            <template #prefix>
              <el-icon><Lock /></el-icon>
            </template>
            <template #suffix>
              <el-icon class="password-toggle" @click="showPassword = !showPassword">
                <component :is="showPassword ? Hide : View" />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item v-if="error" class="error-message">
          <el-alert :title="error" type="error" :closable="true" @close="error = ''" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" size="large" class="login-btn" :loading="loading" @click="handleLogin">
            {{ loading ? '登录中...' : '登录' }}
          </el-button>
        </el-form-item>

        <div class="mode-switch">
          <span>还没有账号？</span>
          <el-button link type="primary" :disabled="loading" @click="switchToRegister">注册账号</el-button>
        </div>
      </el-form>

      <el-form
        v-else
        ref="registerFormRef"
        :model="registerForm"
        :rules="registerRules"
        class="login-form"
        @keyup.enter="handleRegister"
      >
        <el-form-item prop="username">
          <el-input v-model.trim="registerForm.username" placeholder="请输入用于注册的邮箱" autocomplete="email" inputmode="email" :disabled="loading" clearable size="large" @update:model-value="clearError">
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="registerForm.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="密码"
            autocomplete="new-password"
            :disabled="loading"
            clearable
            size="large"
            @update:model-value="clearError"
          >
            <template #prefix>
              <el-icon><Lock /></el-icon>
            </template>
            <template #suffix>
              <el-icon class="password-toggle" @click="showPassword = !showPassword">
                <component :is="showPassword ? Hide : View" />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item prop="confirmPassword">
          <el-input
            v-model="registerForm.confirmPassword"
            :type="showPassword ? 'text' : 'password'"
            placeholder="确认密码（至少 6 位）"
            autocomplete="new-password"
            :disabled="loading"
            clearable
            size="large"
            @update:model-value="clearError"
          >
            <template #prefix>
              <el-icon><Lock /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item v-if="error" class="error-message">
          <el-alert :title="error" type="error" :closable="true" @close="error = ''" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" size="large" class="login-btn" :loading="loading" @click="handleRegister">
            {{ loading ? '注册中...' : '注册' }}
          </el-button>
        </el-form-item>

        <div class="mode-switch">
          <span>已有账号？</span>
          <el-button link type="primary" :disabled="loading" @click="switchToLogin">返回登录</el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { User, Lock, View, Hide } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { register } from '@/api/auth'
import { useUserStore } from '@/stores/user'
import { useDeliveryStore } from '@/stores/delivery'
import { useInterviewStore } from '@/stores/interview'
import { getRedirectPath } from '@/router'

const router = useRouter()
const userStore = useUserStore()
const deliveryStore = useDeliveryStore()
const interviewStore = useInterviewStore()
const loginFormRef = ref<FormInstance>()
const registerFormRef = ref<FormInstance>()

const loginForm = reactive({
  username: '',
  password: ''
})

const registerForm = reactive({
  username: '',
  password: '',
  confirmPassword: ''
})

const loginRules: FormRules<typeof loginForm> = {
  username: [
    { required: true, message: '请输入注册邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入注册时使用的有效邮箱地址', trigger: ['blur', 'change'] }
  ],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const validateConfirmPassword = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
  if (!value) {
    callback(new Error('请再次输入密码'))
    return
  }

  if (value !== registerForm.password) {
    callback(new Error('两次密码必须一致'))
    return
  }

  callback()
}

const registerRules: FormRules<typeof registerForm> = {
  username: [
    { required: true, message: '请输入用于注册的邮箱', trigger: 'blur' },
    { type: 'email', message: '注册账号必须使用有效的邮箱地址', trigger: ['blur', 'change'] }
  ],
  password: [
    { required: true, message: '请设置密码', trigger: 'blur' },
    { min: 6, message: '密码至少需要 6 位', trigger: ['blur', 'change'] }
  ],
  confirmPassword: [{ validator: validateConfirmPassword, trigger: ['blur', 'change'] }]
}

const loading = ref(false)
const error = ref('')
const showPassword = ref(false)
const isRegisterMode = ref(false)

function clearError() {
  if (error.value) error.value = ''
}

type AuthAction = 'login' | 'register'

function getAuthErrorMessage(err: unknown, action: AuthAction) {
  const authError = err as { code?: unknown; message?: unknown }
  const code = typeof authError?.code === 'string' ? authError.code : ''
  const rawMessage = typeof authError?.message === 'string' ? authError.message.toLowerCase() : ''

  const messageByCode: Record<string, string> = {
    invalid_credentials: '邮箱或密码错误，请检查后重试',
    email_not_confirmed: '该邮箱尚未完成验证，请先前往邮箱点击确认链接',
    user_already_exists: '该邮箱已注册，请直接返回登录',
    email_exists: '该邮箱已注册，请直接返回登录',
    weak_password: '密码强度不足，请至少使用 6 位字符并避免过于简单的密码',
    email_address_invalid: '邮箱地址格式无效，请检查后重新输入',
    signup_disabled: '当前暂未开放新用户注册',
    over_email_send_rate_limit: '验证邮件发送过于频繁，请稍后再试',
    over_request_rate_limit: '操作过于频繁，请稍后再试',
    captcha_failed: '人机验证失败，请刷新页面后重试'
  }

  if (code && messageByCode[code]) return messageByCode[code]
  if (rawMessage.includes('invalid login credentials')) return '邮箱或密码错误，请检查后重试'
  if (rawMessage.includes('email not confirmed')) return '该邮箱尚未完成验证，请先前往邮箱点击确认链接'
  if (rawMessage.includes('already registered') || rawMessage.includes('already exists')) {
    return '该邮箱已注册，请直接返回登录'
  }
  if (rawMessage.includes('password') && (rawMessage.includes('weak') || rawMessage.includes('least'))) {
    return '密码强度不足，请至少使用 6 位字符并避免过于简单的密码'
  }
  if (rawMessage.includes('fetch') || rawMessage.includes('network')) {
    return '网络连接异常，请检查网络后重试'
  }

  return action === 'login'
    ? '登录失败，请确认邮箱和密码是否正确'
    : '注册失败，请检查邮箱和密码后重试'
}

function switchToRegister() {
  error.value = ''
  isRegisterMode.value = true
  registerForm.username = loginForm.username
  registerForm.password = ''
  registerForm.confirmPassword = ''
}

function switchToLogin() {
  error.value = ''
  isRegisterMode.value = false
  loginForm.username = registerForm.username
  loginForm.password = ''
}

async function handleLogin() {
  if (!loginFormRef.value) return

  try {
    await loginFormRef.value.validate()
  } catch {
    return
  }

  loading.value = true
  error.value = ''

  try {
    await userStore.login(loginForm.username.toLowerCase(), loginForm.password)
    await Promise.all([
      deliveryStore.fetchDeliveries({ page: 1, pageSize: 1000 }),
      interviewStore.fetchInterviews()
    ])
    ElMessage.success('登录成功')
    router.push(getRedirectPath())
  } catch (err) {
    error.value = getAuthErrorMessage(err, 'login')
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  if (!registerFormRef.value) return

  try {
    await registerFormRef.value.validate()
  } catch {
    return
  }

  loading.value = true
  error.value = ''

  try {
    const { session } = await register({
      username: registerForm.username.toLowerCase(),
      password: registerForm.password
    })
    ElMessage.success(
      session
        ? '注册成功，请使用邮箱和密码登录'
        : '注册申请已提交，请前往邮箱完成验证后再登录'
    )
    switchToLogin()
  } catch (err) {
    error.value = getAuthErrorMessage(err, 'register')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-form-wrapper {
  width: 100%;
  max-width: 400px;
  padding: 40px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  animation: slideUp 0.4s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-header {
  text-align: center;
  margin-bottom: 30px;

  .app-title {
    font-size: 28px;
    font-weight: 600;
    margin: 0 0 8px;
    color: #1f2937;
  }

  .subtitle {
    font-size: 14px;
    color: #6b7280;
    margin: 0;
  }
}

.auth-tip {
  margin-bottom: 20px;
}

.login-form {
  :deep(.el-form-item) {
    margin-bottom: 20px;

    &:last-of-type {
      margin-bottom: 16px;
    }
  }

  :deep(.el-input__wrapper) {
    background-color: #f9fafb;
    border-color: #e5e7eb;

    &:hover {
      background-color: #f3f4f6;
      border-color: #d1d5db;
    }

    &.is-focus {
      background-color: white;
      border-color: #667eea;
    }
  }
}

.password-toggle {
  cursor: pointer;
  color: #9ca3af;
  transition: color 0.2s;

  &:hover {
    color: #667eea;
  }
}

.error-message {
  margin-bottom: 16px;

  :deep(.el-alert) {
    padding: 8px 12px;
  }
}

.login-btn {
  width: 100%;
  height: 40px;
  font-size: 16px;
  font-weight: 500;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border: none;
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }

  &:disabled {
    background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  }
}

.mode-switch {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #6b7280;
  font-size: 14px;
}

@media (max-width: 768px) {
  .login-container {
    padding: 16px;
  }

  .login-form-wrapper {
    max-width: 100%;
    padding: 32px 20px;
  }

  .login-header {
    .app-title {
      font-size: 24px;
    }
  }
}

@media (max-width: 480px) {
  .login-form-wrapper {
    padding: 24px 16px;
  }

  .login-header {
    margin-bottom: 24px;

    .app-title {
      font-size: 20px;
    }

    .subtitle {
      font-size: 12px;
    }
  }
}
</style>
