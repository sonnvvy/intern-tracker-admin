import { API_CODE_BUSINESS, API_CODE_SYSTEM, API_CODE_UPSTREAM } from '../http.js'
import { LLMClient, LLMConfigurationError } from './llm-client.js'
import { processAIOutput } from './pipeline.js'
import type { ProcessedAIOutput } from './formatter.js'
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
const EMPTY_ANSWER_FALLBACK = 'AI 服务暂时没有返回有效内容，请稍后重试。'

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

function stringifySafe(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim()
  }

  if (value === null || typeof value === 'undefined') {
    return ''
  }

  try {
    return JSON.stringify(value)
  } catch {
    return ''
  }
}

function getProcessedText(output: ProcessedAIOutput): string {
  if (typeof output.data === 'string') {
    return output.data.trim()
  }

  if (output.data && typeof output.data === 'object' && 'answer' in output.data) {
    const answer = (output.data as { answer?: unknown }).answer
    if (typeof answer === 'string' && answer.trim()) {
      return answer.trim()
    }
  }

  return stringifySafe(output.data)
}

function normalizeResumeResult(output: ProcessedAIOutput): unknown {
  if (output.success && output.data && typeof output.data === 'object') {
    return output.data
  }

  const rawText = getProcessedText(output)
  return {
    rawText,
    note: output.error || 'Model response is not standard JSON, fallback rawText is returned.'
  }
}

function normalizeJobMatchResult(value: unknown, rawText: string): JobMatchResult {
  const payload = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const summary = typeof payload.summary === 'string' && payload.summary.trim() ? payload.summary.trim() : rawText

  return {
    matchScore: normalizeScore(payload.matchScore),
    missingSkills: toStringArray(payload.missingSkills),
    resumeImprovements: toStringArray(payload.resumeImprovements),
    interviewPrep: toStringArray(payload.interviewPrep),
    summary: summary || EMPTY_ANSWER_FALLBACK
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

      const output = processAIOutput(result.content)
      return { answer: getProcessedText(output) || output.error || EMPTY_ANSWER_FALLBACK }
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

      return normalizeResumeResult(processAIOutput(result.content))
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

      const output = processAIOutput(result.content)
      return normalizeJobMatchResult(output.success ? output.data : null, getProcessedText(output))
    } catch (error) {
      throw toServiceError(error)
    }
  }
}

export function createAIService(): AIService {
  return new AIService()
}