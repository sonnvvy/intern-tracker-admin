import axios from 'axios'
import type { ChatAssistantResult, JobAdviceResult } from '@/types'
import { getToken } from '@/utils/auth'
import { createAppError, toAppError } from './error'
import router from '@/router'

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

        const userStore = useUserStore()

        // 清空登录状态
        userStore.clearToken()

        // 跳转到登录页
        router.push('/login')
      }

      return Promise.reject(toAppError(error))
    }
  )
}

// 为两个实例设置拦截器
setupInterceptors(apiClient)
setupInterceptors(vercelAiClient)

interface ApiEnvelope<T> {
  success?: boolean
  code?: number
  message?: string
  data?: T
}

function resolveEnvelopeData<T>(envelope: ApiEnvelope<T> | undefined, fallbackMessage: string): T {
  if (!envelope) {
    throw createAppError('system', fallbackMessage)
  }

  if (envelope.code === 0 && typeof envelope.data !== 'undefined') {
    return envelope.data
  }

  if (envelope.success === true && typeof envelope.data !== 'undefined') {
    return envelope.data
  }

  throw createAppError('business', envelope.message || fallbackMessage, {
    code: envelope.code
  })
}

export async function analyzeResume(resumeText: string): Promise<any> {
  const text = resumeText.trim()
  if (!text) {
    throw createAppError('business', '简历文本不能为空')
  }

  try {
    const response = await vercelAiClient.post<ApiEnvelope<any>>('/ai/analyze-resume', {
      resumeText: text
    })

    return resolveEnvelopeData(response.data, '简历分析失败，请稍后重试')
  } catch (error) {
    throw toAppError(error, '简历解析请求失败，请稍后重试')
  }
}

export async function askInterviewQuestion(question: string): Promise<ChatAssistantResult> {
  const q = question.trim()
  if (!q) {
    throw createAppError('business', '问题不能为空')
  }

  try {
    const { data } = await vercelAiClient.post<ApiEnvelope<ChatAssistantResult>>('/ai/interview-chat', { question: q })
    return resolveEnvelopeData(data, '面试问答请求失败，请稍后重试')
  } catch (error) {
    throw toAppError(error, '面试问答请求失败，请稍后重试')
  }
}

export async function analyzeJobMatch(payload: { jd: string; resumeText: string }): Promise<JobAdviceResult> {
  const jd = payload.jd.trim()
  const resumeText = payload.resumeText.trim()
  if (!jd || !resumeText) {
    throw createAppError('business', 'jd 和 resumeText 不能为空')
  }

  try {
    const { data } = await vercelAiClient.post<ApiEnvelope<JobAdviceResult>>('/ai/job-match', {
      jd,
      resumeText
    })

    return resolveEnvelopeData(data, '岗位匹配分析失败，请稍后重试')
  } catch (error) {
    throw toAppError(error, '岗位匹配分析失败，请稍后重试')
  }
}
