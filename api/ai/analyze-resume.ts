import type { VercelRequest, VercelResponse } from '@vercel/node'
import { parseJsonBody, setJsonHeaders } from '../_lib/http'

interface AnalyzeResumeRequestBody {
  resumeText?: string
}

interface SuccessResponse<T> {
  success: true
  data: T
}

interface ErrorResponse {
  success: false
  message: string
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: unknown
    }
  }>
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

function sendError(res: VercelResponse, status: number, message: string): void {
  setJsonHeaders(res)
  res.status(status).json({
    success: false,
    message
  } satisfies ErrorResponse)
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

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
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

    const apiKey = process.env.LLM_API_KEY
    const apiUrl = process.env.LLM_API_URL
    const model = process.env.LLM_MODEL

    logInfo('request received', {
      hasApiKey: Boolean(apiKey),
      hasApiUrl: Boolean(apiUrl),
      hasModel: Boolean(model),
      resumeTextLength: resumeText.length
    })

    if (!apiKey || !apiUrl || !model) {
      sendError(res, 500, 'Server configuration error')
      return
    }

    let validatedApiUrl: string
    try {
      validatedApiUrl = new URL(apiUrl).toString()
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
          Authorization: 'Bearer ' + apiKey
        },
        body: JSON.stringify({
          model,
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

      sendError(res, 500, isTimeout ? 'LLM request timeout' : 'Failed to call LLM service')
      return
    } finally {
      clearTimeout(timeoutId)
    }

    logInfo('llm response received', {
      status: llmResponse.status,
      ok: llmResponse.ok
    })

    if (!llmResponse.ok) {
      sendError(res, 500, 'LLM service returned an error')
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

    setJsonHeaders(res)
    res.status(200).json({
      success: true,
      data
    } satisfies SuccessResponse<unknown>)

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
