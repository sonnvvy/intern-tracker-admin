<template>
  <div class="login-container">
    <div class="login-form-wrapper">
      <div class="login-header">
        <h1 class="app-title">求职进度台</h1>
        <p class="subtitle">{{ isRegisterMode ? '创建账号后开始管理岗位投递' : '前端求职追踪系统' }}</p>
      </div>

      <el-form
        v-if="!isRegisterMode"
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
        @keyup.enter="handleLogin"
      >
        <el-form-item prop="username">
          <el-input v-model="loginForm.username" placeholder="邮箱" :disabled="loading" clearable size="large">
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
          <el-input v-model="registerForm.username" placeholder="邮箱" :disabled="loading" clearable size="large">
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
            placeholder="确认密码"
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
import { getRedirectPath } from '@/router'

const router = useRouter()
const userStore = useUserStore()
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
    { required: true, message: '邮箱不能为空', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: ['blur', 'change'] }
  ],
  password: [{ required: true, message: '密码不能为空', trigger: 'blur' }]
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
    { required: true, message: '邮箱不能为空', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: ['blur', 'change'] }
  ],
  password: [{ required: true, message: '密码不能为空', trigger: 'blur' }],
  confirmPassword: [{ validator: validateConfirmPassword, trigger: 'blur' }]
}

const loading = ref(false)
const error = ref('')
const showPassword = ref(false)
const isRegisterMode = ref(false)

function clearError() {
  if (error.value) error.value = ''
}

function getErrorMessage(err: unknown, fallback: string) {
  if (err && typeof err === 'object' && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response
    return response?.data?.message || fallback
  }

  return err instanceof Error ? err.message : fallback
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
    await userStore.login(loginForm.username, loginForm.password)
    ElMessage.success('登录成功')
    router.push(getRedirectPath())
  } catch (err) {
    error.value = getErrorMessage(err, '登录失败，请重试')
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
    await register({
      username: registerForm.username,
      password: registerForm.password
    })
    ElMessage.success('注册成功，请登录')
    switchToLogin()
  } catch (err) {
    error.value = getErrorMessage(err, '注册失败')
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
