import { API_CODE_BUSINESS, API_CODE_SYSTEM, API_CODE_UPSTREAM } from '../http.js'
import { LLMClient, LLMConfigurationError } from './llm-client.js'
import { interviewPrompt } from './prompts/interview.js'
import { resumePrompt } from './prompts/resume.js'
import { jobMatchPrompt } from './prompts/job.js'
import { getContext } from './rag/retriever.js'

export interface InterviewChatResult {
  answer: string
}

export interface JobMatchInput {
  jd?: unknown
  resumeText?: unknown
}

export interface JobMatchResult {
  matchScore: number
  missingSkills: string[]
  resumeImprovements: string[]
  interviewPrep: string[]
  summary: string
}

export class AIServiceError extends Error {
  readonly status: number
  readonly code: number

  constructor(status: number, code: number, message: string) {
    super(message)
    this.name = 'AIServiceError'
    this.status = status
    this.code = code
  }
}

const MAX_RESUME_TEXT_LENGTH = 20_000

function businessError(message: string): AIServiceError {
  return new AIServiceError(400, API_CODE_BUSINESS, message)
}

function systemError(message: string): AIServiceError {
  return new AIServiceError(500, API_CODE_SYSTEM, message)
}

function upstreamError(message: string): AIServiceError {
  return new AIServiceError(502, API_CODE_UPSTREAM, message)
}

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
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

function toServiceError(error: unknown): AIServiceError {
  if (error instanceof AIServiceError) {
    return error
  }

  if (error instanceof LLMConfigurationError) {
    return systemError(error.message)
  }

  const message = error instanceof Error ? error.message : 'Failed to call LLM service'
  return upstreamError(message)
}

export class AIService {
  private readonly llmClient: LLMClient

  constructor(llmClient = new LLMClient()) {
    this.llmClient = llmClient
  }

  async interviewChat(question: unknown, context?: unknown): Promise<InterviewChatResult> {
    const message = asTrimmedString(question)
    const localContext = asTrimmedString(context)

    if (!message) {
      throw businessError('message is required')
    }

    try {
      const ragContext = await getContext(message)
      const contextBlocks = [localContext, ragContext].filter(Boolean).join('\n\n')
      const userContent = contextBlocks
        ? ['参考上下文：', contextBlocks, '', '用户问题：', message].join('\n')
        : message

      const result = await this.llmClient.chat(
        [
          { role: 'system', content: interviewPrompt },
          { role: 'user', content: userContent }
        ],
        { temperature: 0.3 }
      )

      return { answer: result.content }
    } catch (error) {
      throw toServiceError(error)
    }
  }

  async resumeAnalysis(resumeTextInput: unknown): Promise<unknown> {
    const resumeText = asTrimmedString(resumeTextInput)

    if (!resumeText) {
      throw businessError('resumeText is required')
    }

    if (resumeText.length > MAX_RESUME_TEXT_LENGTH) {
      throw businessError('resumeText is too long')
    }

    try {
      const result = await this.llmClient.chat(
        [
          { role: 'system', content: resumePrompt },
          { role: 'user', content: resumeText }
        ],
        { temperature: 0.2 }
      )

      const parsedData = tryParseModelJson(result.content)
      return parsedData !== null
        ? parsedData
        : {
            rawText: result.content,
            note: 'Model response is not standard JSON, fallback rawText is returned.'
          }
    } catch (error) {
      throw toServiceError(error)
    }
  }

  async jobMatch(input: JobMatchInput): Promise<JobMatchResult> {
    const jd = asTrimmedString(input.jd)
    const resumeText = asTrimmedString(input.resumeText)

    if (!jd || !resumeText) {
      throw businessError('jd and resumeText are required')
    }

    try {
      const ragContext = await getContext(jd)
      const userContent = [
        ragContext ? ['参考上下文：', ragContext].join('\n') : '',
        ['岗位 JD：', jd, '', '简历文本：', resumeText].join('\n')
      ]
        .filter(Boolean)
        .join('\n\n')

      const result = await this.llmClient.chat(
        [
          { role: 'system', content: jobMatchPrompt },
          { role: 'user', content: userContent }
        ],
        { temperature: 0.2 }
      )

      const parsedData = tryParseModelJson(result.content)
      return normalizeJobMatchResult(parsedData, result.content)
    } catch (error) {
      throw toServiceError(error)
    }
  }
}

export function createAIService(): AIService {
  return new AIService()
}