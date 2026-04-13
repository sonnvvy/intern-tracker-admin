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

interface InterviewChatRequestBody {
  question?: string
}

interface InterviewChatResult {
  answer: string
  keyPoints: string[]
  followUps: string[]
  confidence: 'low' | 'medium' | 'high'
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

const INTERVIEW_PROMPT = [
  '你是专业的面试辅导助手。',
  '请根据用户问题，返回结构化 JSON，字段必须包含：',
  'answer: string（建议回答）',
  'keyPoints: string[]（关键要点，3-6条）',
  'followUps: string[]（可追问方向，2-5条）',
  "confidence: 'low' | 'medium' | 'high'",
  '只返回 JSON，不要额外解释。'
].join('\n')

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

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeConfidence(value: unknown): 'low' | 'medium' | 'high' {
  if (value === 'low' || value === 'medium' || value === 'high') {
    return value
  }
  return 'medium'
}

function normalizeInterviewChatResult(value: unknown, rawText: string): InterviewChatResult {
  const payload = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

  const answer = typeof payload.answer === 'string' && payload.answer.trim() ? payload.answer.trim() : rawText

  return {
    answer,
    keyPoints: toStringArray(payload.keyPoints),
    followUps: toStringArray(payload.followUps),
    confidence: normalizeConfidence(payload.confidence)
  }
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
    const body = await parseJsonBody<InterviewChatRequestBody>(req)
    const question = body.question?.trim()

    if (!question) {
      sendError(res, 400, 'question is required')
      return
    }

    const llmConfig = resolveLlmConfig()

    if (!llmConfig) {
      sendError(res, 500, 'Missing required server environment variables for LLM')
      return
    }

    const llmResponse = await fetch(toChatCompletionsUrl(llmConfig.apiUrl), {
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
            content: INTERVIEW_PROMPT
          },
          {
            role: 'user',
            content: question
          }
        ],
        temperature: 0.3
      })
    })

    const rawResponseText = await llmResponse.text()

    if (!llmResponse.ok) {
      const detail = rawResponseText.slice(0, 500)
      sendError(
        res,
        500,
        'LLM API request failed with status ' + llmResponse.status + ': ' + (detail || 'Unknown error')
      )
      return
    }

    const responseJson = safeJsonParse(rawResponseText) as ChatCompletionResponse | null
    const modelContent = normalizeMessageContent(responseJson?.choices?.[0]?.message?.content)
    const parsedData = modelContent ? tryParseModelJson(modelContent) : null
    const normalized = normalizeInterviewChatResult(parsedData, modelContent || rawResponseText)

    sendOk<InterviewChatResult>(res, normalized)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    sendFail(res, 500, API_CODE_UPSTREAM, message)
  }
}
