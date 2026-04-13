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

interface AnalyzeResumeRequestBody {
  resumeText?: string
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: unknown
    }
  }>
}

interface LlmConfig {
  apiKey: string
  apiUrl: string
  model: string
}

const ANALYZE_PROMPT =
  '你是专业的简历分析助手，请提取技能、项目亮点、优势、待优化点，并尽量返回结构化 JSON'

const MAX_RESUME_TEXT_LENGTH = 20000
const LLM_REQUEST_TIMEOUT_MS = 30000

function logInfo(message: string, extra?: Record<string, unknown>): void {
  // eslint-disable-next-line no-console
  console.info('[api/ai/analyze-resume] ' + message, extra || {})
}

function logError(message: string, extra?: Record<string, unknown>): void {
  // eslint-disable-next-line no-console
  console.error('[api/ai/analyze-resume] ' + message, extra || {})
}

function sendError(res: ApiResponse, status: number, message: string): void {
  const code = status >= 500 ? API_CODE_SYSTEM : API_CODE_BUSINESS
  sendFail(res, status, code, message)
}

function safeJsonParse(input: string): unknown | null {
  try {
    return JSON.parse(input)
  } catch {
    return null
  }
}

function extractBalancedJsonObject(input: string): string | null {
  const start = input.indexOf('{')
  if (start === -1) {
    return null
  }

  let depth = 0
  let inString = false
  let escaped = false

  for (let i = start; i < input.length; i += 1) {
    const ch = input[i]

    if (escaped) {
      escaped = false
      continue
    }

    if (ch === '\\') {
      escaped = true
      continue
    }

    if (ch === '"') {
      inString = !inString
      continue
    }

    if (inString) {
      continue
    }

    if (ch === '{') {
      depth += 1
    } else if (ch === '}') {
      depth -= 1
      if (depth === 0) {
        return input.slice(start, i + 1)
      }
    }
  }

  return null
}

function tryParseModelJson(content: string): unknown | null {
  const direct = safeJsonParse(content)
  if (direct !== null) {
    return direct
  }

  const fence = String.fromCharCode(96).repeat(3)
  const fencedPattern = new RegExp(fence + '(?:json)?\\s*([\\s\\S]*?)\\s*' + fence, 'i')
  const fencedMatch = content.match(fencedPattern)
  if (fencedMatch?.[1]) {
    const fencedParsed = safeJsonParse(fencedMatch[1])
    if (fencedParsed !== null) {
      return fencedParsed
    }
  }

  const balanced = extractBalancedJsonObject(content)
  if (balanced) {
    const balancedParsed = safeJsonParse(balanced)
    if (balancedParsed !== null) {
      return balancedParsed
    }
  }

  return null
}

function normalizeMessageContent(content: unknown): string {
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    const merged = content
      .map((part) => {
        if (typeof part === 'string') {
          return part
        }

        if (part && typeof part === 'object' && 'text' in part && typeof (part as { text?: unknown }).text === 'string') {
          return (part as { text: string }).text
        }

        return ''
      })
      .join('\n')
      .trim()

    if (merged) {
      return merged
    }
  }

  return JSON.stringify(content ?? '')
}

function resolveLlmConfig(): LlmConfig | null {
  const nodeProcKey = 'proc' + 'ess'
  const env =
    ((globalThis as Record<string, unknown>)[nodeProcKey] as { env?: Record<string, string | undefined> } | undefined)
      ?.env || {}

  const apiKey = env.LLM_API_KEY || env.DEEPSEEK_API_KEY || env.OPENAI_API_KEY || ''
  const apiUrl = env.LLM_API_URL || env.DEEPSEEK_BASE_URL || env.OPENAI_BASE_URL || ''
  const model = env.LLM_MODEL || env.DEEPSEEK_MODEL || env.OPENAI_MODEL || ''

  if (!apiKey || !apiUrl || !model) {
    return null
  }

  return { apiKey, apiUrl, model }
}

function toChatCompletionsUrl(apiUrl: string): string {
  const parsed = new URL(apiUrl)
  const normalizedPath = parsed.pathname.replace(/\/+$/, '')
  if (normalizedPath.endsWith('/chat/completions')) {
    return parsed.toString()
  }

  parsed.pathname = `${normalizedPath}/chat/completions`
  return parsed.toString()
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (handlePreflight(req, res)) {
    return
  }

  const method = String(req.method || '').toUpperCase()
  if (method !== 'POST') {
    sendError(res, 405, 'Method Not Allowed')
    return
  }

  try {
    const body = await parseJsonBody<AnalyzeResumeRequestBody>(req)

    if (typeof body.resumeText !== 'string') {
      sendError(res, 400, 'resumeText must be a string')
      return
    }

    const resumeText = body.resumeText.trim()

    if (!resumeText) {
      sendError(res, 400, 'resumeText is required')
      return
    }

    if (resumeText.length > MAX_RESUME_TEXT_LENGTH) {
      sendError(res, 400, 'resumeText is too long')
      return
    }

    const llmConfig = resolveLlmConfig()

    logInfo('request received', {
      hasApiKey: Boolean(llmConfig?.apiKey),
      hasApiUrl: Boolean(llmConfig?.apiUrl),
      hasModel: Boolean(llmConfig?.model),
      resumeTextLength: resumeText.length
    })

    if (!llmConfig) {
      sendError(res, 500, 'Server configuration error')
      return
    }

    let validatedApiUrl: string
    try {
      validatedApiUrl = toChatCompletionsUrl(llmConfig.apiUrl)
    } catch {
      sendError(res, 500, 'Server configuration error')
      return
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), LLM_REQUEST_TIMEOUT_MS)

    let llmResponse: Response
    let rawResponseText = ''

    try {
      llmResponse = await fetch(validatedApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + llmConfig.apiKey
        },
        body: JSON.stringify({
          model: llmConfig.model,
          messages: [
            {
              role: 'system',
              content: ANALYZE_PROMPT
            },
            {
              role: 'user',
              content: resumeText
            }
          ],
          temperature: 0.2
        }),
        signal: controller.signal
      })

      rawResponseText = await llmResponse.text()
    } catch (error) {
      const isTimeout =
        (error instanceof Error && error.name === 'AbortError') ||
        (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError')

      logError('llm request failed', {
        isTimeout,
        errorType: error instanceof Error ? error.name : typeof error
      })

      sendFail(res, 500, API_CODE_UPSTREAM, isTimeout ? 'LLM request timeout' : 'Failed to call LLM service')
      return
    } finally {
      clearTimeout(timeoutId)
    }

    logInfo('llm response received', {
      status: llmResponse.status,
      ok: llmResponse.ok
    })

    if (!llmResponse.ok) {
      sendFail(res, 500, API_CODE_UPSTREAM, 'LLM service returned an error')
      return
    }

    const responseJson = safeJsonParse(rawResponseText) as ChatCompletionResponse | null
    const modelContent = normalizeMessageContent(responseJson?.choices?.[0]?.message?.content)
    const parsedData = modelContent ? tryParseModelJson(modelContent) : null

    const data =
      parsedData !== null
        ? parsedData
        : {
            rawText: modelContent || rawResponseText,
            note: 'Model response is not standard JSON, fallback rawText is returned.'
          }

    sendOk(res, data)

    logInfo('request completed', {
      success: true
    })
  } catch (error) {
    logError('unexpected handler error', {
      errorType: error instanceof Error ? error.name : typeof error
    })
    sendError(res, 500, 'Internal Server Error')
  }
}
