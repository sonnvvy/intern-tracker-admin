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

interface JobMatchRequestBody {
  jd?: string
  resumeText?: string
}

interface JobMatchResult {
  matchScore: number
  missingSkills: string[]
  resumeImprovements: string[]
  interviewPrep: string[]
  summary: string
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

const JOB_MATCH_PROMPT = [
  '你是专业的岗位匹配分析助手。',
  '请结合岗位 JD 和候选人简历内容，返回结构化 JSON，字段必须包含：',
  'matchScore: number（0-100）',
  'missingSkills: string[]（缺失技能）',
  'resumeImprovements: string[]（简历优化建议）',
  'interviewPrep: string[]（面试准备建议）',
  'summary: string（综合结论）',
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

function normalizeScore(value: unknown): number {
  const score = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(score)) {
    return 0
  }
  return Math.max(0, Math.min(100, Math.round(score)))
}

function normalizeJobMatchResult(value: unknown, rawText: string): JobMatchResult {
  const payload = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

  const summary = typeof payload.summary === 'string' && payload.summary.trim() ? payload.summary.trim() : rawText

  return {
    matchScore: normalizeScore(payload.matchScore),
    missingSkills: toStringArray(payload.missingSkills),
    resumeImprovements: toStringArray(payload.resumeImprovements),
    interviewPrep: toStringArray(payload.interviewPrep),
    summary
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
    const body = await parseJsonBody<JobMatchRequestBody>(req)
    const jd = body.jd?.trim()
    const resumeText = body.resumeText?.trim()

    if (!jd || !resumeText) {
      sendError(res, 400, 'jd and resumeText are required')
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
            content: JOB_MATCH_PROMPT
          },
          {
            role: 'user',
            content: ['岗位 JD：', jd, '', '简历文本：', resumeText].join('\n')
          }
        ],
        temperature: 0.2
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
    const normalized = normalizeJobMatchResult(parsedData, modelContent || rawResponseText)

    sendOk<JobMatchResult>(res, normalized)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    sendFail(res, 500, API_CODE_UPSTREAM, message)
  }
}
