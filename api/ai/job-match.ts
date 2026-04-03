import type { VercelRequest, VercelResponse } from '@vercel/node'
import { parseJsonBody, setJsonHeaders } from '../_lib/http'

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

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
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

    const apiKey = process.env.LLM_API_KEY
    const apiUrl = process.env.LLM_API_URL
    const model = process.env.LLM_MODEL

    if (!apiKey || !apiUrl || !model) {
      sendError(res, 500, 'Missing required server environment variables: LLM_API_KEY, LLM_API_URL, LLM_MODEL')
      return
    }

    const llmResponse = await fetch(apiUrl, {
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

    setJsonHeaders(res)
    res.status(200).json({
      success: true,
      data: normalized
    } satisfies SuccessResponse<JobMatchResult>)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    sendError(res, 500, message)
  }
}
