import { ChatOpenAI } from '@langchain/openai'

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function resolveApiKey(): string {
  return process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || ''
}

function resolveModel(): string {
  return process.env.DEEPSEEK_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini'
}

function resolveBaseUrl(): string | undefined {
  return process.env.DEEPSEEK_BASE_URL || process.env.OPENAI_BASE_URL
}

export function createChatModel(): ChatOpenAI {
  const apiKey = resolveApiKey()
  if (!apiKey) {
    throw new Error('Missing required environment variable: DEEPSEEK_API_KEY or OPENAI_API_KEY')
  }

  return new ChatOpenAI({
    apiKey,
    model: resolveModel(),
    configuration: resolveBaseUrl()
      ? {
          baseURL: resolveBaseUrl()
        }
      : undefined,
    temperature: 0.3
  })
}
