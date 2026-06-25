import {
  API_CODE_BUSINESS,
  API_CODE_SYSTEM,
  API_CODE_UPSTREAM,
  handlePreflight,
  parseJsonBody,
  sendFail,
  sendOk
} from '../_lib/http'
import type { ApiRequest, ApiResponse } from '../_lib/http'
import { resolveLlmConfig, toChatCompletionsUrl } from '../_lib/llm-config'

interface InterviewChatRequestBody {
  message?: unknown
  context?: unknown
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: unknown
    }
  }>
}

const SYSTEM_PROMPT =
  'You are an interview coaching and job-search assistant. Answer in concise, practical Chinese.'
const REQUEST_TIMEOUT_MS = 30_000

function normalizeContent(content: unknown): string {
  if (typeof content === 'string') return content.trim()

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part
        if (
          part &&
          typeof part === 'object' &&
          'text' in part &&
          typeof (part as { text?: unknown }).text === 'string'
        ) {
          return (part as { text: string }).text
        }
        return ''
      })
      .join('\n')
      .trim()
  }

  return ''
}

function buildUserMessage(message: string, context: string): string {
  if (!context) return message
  return ['参考上下文：', context, '', '用户问题：', message].join('\n')
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (handlePreflight(req, res)) return

  if (String(req.method || '').toUpperCase() !== 'POST') {
    sendFail(res, 405, API_CODE_BUSINESS, 'Method Not Allowed')
    return
  }

  let body: InterviewChatRequestBody
  try {
    body = await parseJsonBody<InterviewChatRequestBody>(req)
  } catch {
    sendFail(res, 400, API_CODE_BUSINESS, 'Request body must be valid JSON')
    return
  }

  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const context = typeof body.context === 'string' ? body.context.trim() : ''

  if (!message) {
    sendFail(res, 400, API_CODE_BUSINESS, 'message is required')
    return
  }

  const llmConfig = resolveLlmConfig()
  if (!llmConfig) {
    sendFail(res, 500, API_CODE_SYSTEM, 'Missing required server environment variables for LLM')
    return
  }

  let validatedApiUrl: string
  try {
    validatedApiUrl = toChatCompletionsUrl(llmConfig.apiUrl)
  } catch {
    sendFail(res, 500, API_CODE_SYSTEM, 'Invalid LLM API URL')
    return
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const upstreamResponse = await fetch(validatedApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${llmConfig.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: llmConfig.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserMessage(message, context) }
        ],
        temperature: 0.3
      }),
      signal: controller.signal
    })

    const rawResponse = await upstreamResponse.text()
    let responseData: ChatCompletionResponse | null = null
    try {
      responseData = JSON.parse(rawResponse) as ChatCompletionResponse
    } catch {
      responseData = null
    }

    if (!upstreamResponse.ok) {
      const detail = rawResponse.slice(0, 500)
      sendFail(
        res,
        502,
        API_CODE_UPSTREAM,
        'LLM API request failed with status ' + upstreamResponse.status + ': ' + (detail || 'Unknown error')
      )
      return
    }

    const answer = normalizeContent(responseData?.choices?.[0]?.message?.content)
    if (!answer) {
      sendFail(res, 502, API_CODE_UPSTREAM, 'LLM service returned an empty answer')
      return
    }

    sendOk(res, { answer })
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError'
    sendFail(res, 502, API_CODE_UPSTREAM, isTimeout ? 'LLM request timeout' : 'Failed to call LLM service')
  } finally {
    clearTimeout(timeoutId)
  }
}
