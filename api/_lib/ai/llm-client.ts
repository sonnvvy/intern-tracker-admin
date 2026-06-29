export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMChatOptions {
  temperature?: number
  timeoutMs?: number
}

export interface LLMChatResult {
  content: string
  raw: unknown
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: unknown
    }
  }>
}

const DEFAULT_TIMEOUT_MS = 30_000

export class LLMConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LLMConfigurationError'
  }
}

export class LLMRequestError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'LLMRequestError'
    this.status = status
  }
}

function readEnv(): Record<string, string | undefined> {
  const nodeProcKey = 'proc' + 'ess'
  return (
    ((globalThis as Record<string, unknown>)[nodeProcKey] as { env?: Record<string, string | undefined> } | undefined)
      ?.env || {}
  )
}

function requiredEnv(name: string): string {
  const value = readEnv()[name]?.trim()
  if (!value) {
    throw new LLMConfigurationError('Missing required environment variable: ' + name)
  }
  return value
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

function normalizeContent(content: unknown): string {
  if (typeof content === 'string') {
    return content.trim()
  }

  if (Array.isArray(content)) {
    return content
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
  }

  return ''
}

export class LLMClient {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly model: string

  constructor() {
    this.apiKey = requiredEnv('LLM_API_KEY')
    this.baseUrl = toChatCompletionsUrl(requiredEnv('LLM_API_URL'))
    this.model = requiredEnv('LLM_MODEL')
  }

  async chat(messages: ChatMessage[], options: LLMChatOptions = {}): Promise<LLMChatResult> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS)

    try {
      const res = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          ...(typeof options.temperature === 'number' ? { temperature: options.temperature } : {})
        }),
        signal: controller.signal
      })

      const rawText = await res.text()
      const raw = rawText ? JSON.parse(rawText) : null

      if (!res.ok) {
        const detail = rawText.slice(0, 500) || 'Unknown error'
        throw new LLMRequestError('LLM API request failed with status ' + res.status + ': ' + detail, res.status)
      }

      const content = normalizeContent((raw as ChatCompletionResponse | null)?.choices?.[0]?.message?.content)
      return { content, raw }
    } catch (error) {
      if (error instanceof LLMRequestError) {
        throw error
      }

      if (error instanceof SyntaxError) {
        throw new LLMRequestError('LLM service returned invalid JSON')
      }

      const isTimeout = error instanceof Error && error.name === 'AbortError'
      throw new LLMRequestError(isTimeout ? 'LLM request timeout' : 'Failed to call LLM service')
    } finally {
      clearTimeout(timeoutId)
    }
  }
}