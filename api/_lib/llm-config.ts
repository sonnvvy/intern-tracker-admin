export interface LlmConfig {
  apiKey: string
  apiUrl: string
  model: string
}

function readEnv(): Record<string, string | undefined> {
  const nodeProcKey = 'proc' + 'ess'
  return (
    ((globalThis as Record<string, unknown>)[nodeProcKey] as { env?: Record<string, string | undefined> } | undefined)
      ?.env || {}
  )
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  return values.map((value) => value?.trim() || '').find(Boolean) || ''
}

export function resolveLlmConfig(): LlmConfig | null {
  const env = readEnv()
  const apiKey = firstNonEmpty(env.LLM_API_KEY, env.DEEPSEEK_API_KEY, env.OPENAI_API_KEY)
  const apiUrl = firstNonEmpty(env.LLM_API_URL, env.DEEPSEEK_BASE_URL, env.OPENAI_BASE_URL)
  const model = firstNonEmpty(env.LLM_MODEL, env.DEEPSEEK_MODEL, env.OPENAI_MODEL)

  if (!apiKey || !apiUrl || !model) {
    return null
  }

  return { apiKey, apiUrl, model }
}

export function toChatCompletionsUrl(apiUrl: string): string {
  const parsed = new URL(apiUrl)
  const normalizedPath = parsed.pathname.replace(/\/+$/, '')

  if (normalizedPath.endsWith('/chat/completions')) {
    return parsed.toString()
  }

  parsed.pathname = `${normalizedPath}/chat/completions`
  return parsed.toString()
}
