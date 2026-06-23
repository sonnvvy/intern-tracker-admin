import { handlePreflight, parseJsonBody, setJsonHeaders } from '../_lib/http'
import type { ApiRequest, ApiResponse } from '../_lib/http'

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

const SYSTEM_PROMPT = '你是一个面试复盘与前端求职助手。'
const REQUEST_TIMEOUT_MS = 30_000

function sendJson(res: ApiResponse, status: number, body: unknown): void {
  setJsonHeaders(res)
  res.status(status).json(body)
}

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
  return `参考上下文：\n${context}\n\n用户问题：\n${message}`
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (handlePreflight(req, res)) return

  if (String(req.method || '').toUpperCase() !== 'POST') {
    sendJson(res, 405, { error: 'Method Not Allowed' })
    return
  }

  let body: InterviewChatRequestBody
  try {
    body = await parseJsonBody<InterviewChatRequestBody>(req)
  } catch {
    sendJson(res, 400, { error: '请求体必须是有效的 JSON' })
    return
  }

  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const context = typeof body.context === 'string' ? body.context.trim() : ''

  if (!message) {
    sendJson(res, 400, { error: 'message 不能为空' })
    return
  }

  const apiUrl = process.env.LLM_API_URL?.trim()
  const apiKey = process.env.LLM_API_KEY?.trim()
  const model = process.env.LLM_MODEL?.trim()

  if (!apiUrl || !apiKey || !model) {
    sendJson(res, 500, { error: '服务端缺少 LLM_API_URL、LLM_API_KEY 或 LLM_MODEL 配置' })
    return
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const upstreamResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserMessage(message, context) }
        ]
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
      sendJson(res, 502, { error: `LLM 服务请求失败（${upstreamResponse.status}）` })
      return
    }

    const answer = normalizeContent(responseData?.choices?.[0]?.message?.content)
    if (!answer) {
      sendJson(res, 502, { error: 'LLM 服务未返回有效回答' })
      return
    }

    sendJson(res, 200, { answer })
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError'
    sendJson(res, 502, { error: isTimeout ? 'LLM 服务响应超时' : '无法连接 LLM 服务' })
  } finally {
    clearTimeout(timeoutId)
  }
}
