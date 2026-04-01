import axios from 'axios'
import type { ChatAssistantResult, JobAdviceResult, ResumeAnalysisResult } from '@/types'

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
