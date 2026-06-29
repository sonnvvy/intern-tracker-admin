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

function setupInterceptors(instance: typeof apiClient | typeof vercelAiClient) {
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

  instance.interceptors.response.use(
    response => response,
    async error => {
      if (error.response?.status === 401) {
        const { useUserStore } = await import('@/stores/user')
        const userStore = useUserStore()

        userStore.clearToken()
        router.push('/login')
      }

      return Promise.reject(toAppError(error))
    }
  )
}

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

interface InterviewChatResponse {
  answer?: string
  keyPoints?: string[]
  followUps?: string[]
  confidence?: 'low' | 'medium' | 'high'
}

function normalizeInterviewResult(value: InterviewChatResponse): ChatAssistantResult {
  const answer = value.answer?.trim()
  if (!answer) {
    throw createAppError('system', 'AI 服务未返回有效回答')
  }

  return {
    answer,
    keyPoints: Array.isArray(value.keyPoints) ? value.keyPoints : [],
    followUps: Array.isArray(value.followUps) ? value.followUps : [],
    confidence: value.confidence || 'medium'
  }
}

export async function askInterviewQuestion(question: string, context = ''): Promise<ChatAssistantResult> {
  const message = question.trim()
  if (!message) {
    throw createAppError('business', '问题不能为空')
  }

  try {
    const { data } = await vercelAiClient.post<ApiEnvelope<InterviewChatResponse> | InterviewChatResponse>(
      '/ai/interview-chat',
      {
        message,
        ...(context.trim() ? { context: context.trim() } : {})
      }
    )

    const payload =
      'data' in data || 'code' in data || 'success' in data
        ? resolveEnvelopeData(data as ApiEnvelope<InterviewChatResponse>, '面试问答请求失败，请稍后重试')
        : (data as InterviewChatResponse)

    return normalizeInterviewResult(payload)
  } catch (error) {
    throw toAppError(error, '面试问答请求失败，请稍后重试')
  }
}

function parseStreamPayload(payload: string): string {
  try {
    const value = JSON.parse(payload) as unknown
    return typeof value === 'string' ? value : ''
  } catch {
    return payload
  }
}

function parseStreamError(event: string): string {
  const dataLine = event
    .split('\n')
    .map(line => line.trim())
    .find(line => line.startsWith('data:'))

  if (!dataLine) {
    return '生成失败，请稍后重试'
  }

  try {
    const payload = JSON.parse(dataLine.slice(5).trim()) as { message?: unknown }
    return typeof payload.message === 'string' && payload.message.trim() ? payload.message : '生成失败，请稍后重试'
  } catch {
    return dataLine.slice(5).trim() || '生成失败，请稍后重试'
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: unknown }
    if (typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message
    }
  } catch {
    // fallback below
  }

  return '面试问答请求失败，请稍后重试'
}

export async function askInterviewQuestionStream(
  question: string,
  onDelta: (answer: string) => void,
  context = ''
): Promise<ChatAssistantResult> {
  const message = question.trim()
  if (!message) {
    throw createAppError('business', '问题不能为空')
  }

  try {
    const token = getToken()
    const response = await fetch('/api/ai/interview-chat', {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        message,
        stream: true,
        ...(context.trim() ? { context: context.trim() } : {})
      })
    })

    if (!response.ok) {
      throw createAppError('business', await readErrorMessage(response), { status: response.status })
    }

    if (!response.body) {
      throw createAppError('network', '浏览器不支持流式响应')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let answer = ''
    let done = false

    while (!done) {
      const chunk = await reader.read()
      done = chunk.done
      buffer += decoder.decode(chunk.value || new Uint8Array(), { stream: !done })

      const events = buffer.split('\n\n')
      buffer = events.pop() || ''

      for (const event of events) {
        const trimmedEvent = event.trim()
        if (!trimmedEvent) {
          continue
        }

        if (trimmedEvent.startsWith('event: error')) {
          throw createAppError('system', parseStreamError(trimmedEvent))
        }

        const dataLines = trimmedEvent
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.startsWith('data:'))

        for (const line of dataLines) {
          const payload = line.slice(5).trim()
          if (payload === '[DONE]') {
            done = true
            break
          }

          const delta = parseStreamPayload(payload)
          if (delta) {
            answer += delta
            onDelta(answer)
          }
        }
      }
    }

    return normalizeInterviewResult({ answer })
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
    throw toAppError(error, '岗位匹配分析请求失败，请稍后重试')
  }
}