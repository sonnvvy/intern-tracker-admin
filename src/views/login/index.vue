<template>
  <div class="login-page">
    <div class="login-card">
      <div class="title-wrap">
        <h1>前端实习求职管理台</h1>
        <p>用来整理岗位投递、面试安排和复盘记录的个人后台项目</p>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" size="large">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名">
            <template #prefix><el-icon><User /></el-icon></template>
          </el-input>
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password>
            <template #prefix><el-icon><Lock /></el-icon></template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" class="login-btn" @click="handleLogin">登录系统</el-button>
        </el-form-item>
      </el-form>

      <div class="tips">演示模式：账号密码可任意填写，用于展示登录流程与状态管理</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useUserStore } from '@/stores/user'

interface LoginForm {
  username: string
  password: string
}

const router = useRouter()
const userStore = useUserStore()
const formRef = ref<FormInstance>()

const form = reactive<LoginForm>({
  username: 'sonnvvy',
  password: '123456'
})

const rules: FormRules<LoginForm> = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

async function handleLogin() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  userStore.login(form.username)
  ElMessage.success('登录成功')
  router.push('/dashboard')
}
</script>

<style scoped lang="scss">
.login-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #eff6ff 0%, #eef2ff 50%, #f5f3ff 100%);
}

.login-card {
  width: 460px;
  background: rgba(255, 255, 255, 0.94);
  padding: 36px;
  border-radius: 24px;
  box-shadow: 0 20px 50px rgba(79, 70, 229, 0.15);
}

.title-wrap {
  margin-bottom: 28px;

  h1 {
    margin: 0 0 10px;
    font-size: 30px;
  }

  p {
    margin: 0;
    color: #6b7280;
    line-height: 1.6;
  }
}

.login-btn {
  width: 100%;
}

.tips {
  margin-top: 8px;
  font-size: 13px;
  color: #909399;
}
</style>
