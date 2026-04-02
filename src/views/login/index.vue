<template>
  <div class="login-container">
    <div class="login-form-wrapper">
      <div class="login-header">
        <h1 class="app-title">求职进度台</h1>
        <p class="subtitle">前端求职追踪系统</p>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        class="login-form"
        @keyup.enter="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="用户名"
            :disabled="loading"
            clearable
            size="large"
          >
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
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
          <el-button
            type="primary"
            size="large"
            class="login-btn"
            :loading="loading"
            @click="handleLogin"
          >
            {{ loading ? '登录中...' : '登录' }}
          </el-button>
        </el-form-item>

        <div class="demo-tips">
          <p><el-icon><InfoFilled /></el-icon> 演示账号</p>
          <p>用户名：<code>admin</code></p>
          <p>密码：<code>123456</code></p>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage, type FormInstance } from 'element-plus'
import { User, Lock, View, Hide, InfoFilled } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getRedirectPath } from '@/router'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref<FormInstance>()

const form = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, message: '用户名至少 3 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 个字符', trigger: 'blur' }
  ]
}

const loading = ref(false)
const error = ref('')
const showPassword = ref(false)

/**
 * 清除错误提示
 */
function clearError() {
  if (error.value) {
    error.value = ''
  }
}

/**
 * 处理登录
 */
async function handleLogin() {
  if (!formRef.value) return

  // 表单验证
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  loading.value = true
  error.value = ''

  try {
    await userStore.login(form.username, form.password)

    ElMessage.success('登录成功！')

    // 获取重定向路径，登录后跳转
    const redirect = getRedirectPath()
    router.push(redirect)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '登录失败，请重试'
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
      margin-bottom: 24px;
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

.demo-tips {
  margin-top: 24px;
  padding: 12px;
  background: #f0f4ff;
  border-radius: 6px;
  border-left: 3px solid #667eea;
  font-size: 13px;
  color: #4b5563;
  line-height: 1.6;

  p {
    margin: 0;

    &:first-child {
      font-weight: 500;
      color: #667eea;
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }

  code {
    background: white;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    color: #764ba2;
  }
}

/* 响应式设计 */
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

  .demo-tips {
    font-size: 12px;
  }
}
</style>
