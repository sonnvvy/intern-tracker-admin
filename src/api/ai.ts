import axios from 'axios'
import type { ChatAssistantResult, JobAdviceResult, ResumeAnalysisResult } from '@/types'
import { getToken } from '@/utils/auth'

function normalizeBaseUrl(baseUrl: string | undefined): string {
  if (!baseUrl || !baseUrl.trim()) {
    return '/ai'
  }
  return baseUrl.replace(/\/$/, '')
}

const apiClient = axios.create({
  baseURL: normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL)
})

const vercelAiClient = axios.create({
  baseURL: '/api'
})

/**
 * 为 axios 实例添加请求和响应拦截器
 */
function setupInterceptors(instance: typeof apiClient | typeof vercelAiClient) {
  // 请求拦截器：自动附加 token
  instance.interceptors.request.use(
    config => {
      const token = getToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    error => {
      return Promise.reject(error)
    }
  )

  // 响应拦截器：处理 401 未授权
  instance.interceptors.response.use(
    response => response,
    async error => {
      if (error.response?.status === 401) {
        // 动态导入以避免循环依赖
        const { useUserStore } = await import('@/stores/user')
        const { useRouter } = await import('vue-router')

        const userStore = useUserStore()
        const router = useRouter()

        // 清空登录状态
        userStore.clearToken()

        // 跳转到登录页
        router.push('/login')
      }

      return Promise.reject(error)
    }
  )
}

// 为两个实例设置拦截器
setupInterceptors(apiClient)
setupInterceptors(vercelAiClient)

interface ApiEnvelope<T> {
  data: T
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) {
    return fallback
  }

  const responseData = error.response?.data as { message?: string; detail?: unknown } | undefined
  if (responseData?.message && responseData.message.trim()) {
    return responseData.message
  }

  if (typeof responseData?.detail === 'string' && responseData.detail.trim()) {
    return responseData.detail
  }

  return fallback
}

export async function analyzeResume(file: File): Promise<ResumeAnalysisResult> {
  const formData = new FormData()
  formData.append('file', file)

  let data: ResumeAnalysisResult
  try {
    const response = await apiClient.post<ResumeAnalysisResult>('/resume/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    data = response.data
  } catch (error) {
    throw new Error(extractErrorMessage(error, '简历解析请求失败，请稍后重试'))
  }

  return data
}

export async function askInterviewQuestion(question: string): Promise<ChatAssistantResult> {
  const { data } = await vercelAiClient.post<ApiEnvelope<ChatAssistantResult>>('/chat', { question })
  return data.data
}

export async function analyzeJobMatch(payload: { jd: string; resumeText: string }): Promise<JobAdviceResult> {
  const { data } = await vercelAiClient.post<ApiEnvelope<JobAdviceResult>>('/job-advice', payload)
  return data.data
}
