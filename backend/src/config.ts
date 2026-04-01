import dotenv from 'dotenv'

dotenv.config()

function getEnv(key: string, defaultValue = ''): string {
  const value = process.env[key]
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim()
  }
  return defaultValue
}

export const config = {
  port: Number(getEnv('BACKEND_PORT', '3001')),
  llmApiUrl: getEnv('LLM_API_URL', getEnv('LLM_BASE_URL', 'https://api.openai.com/v1')),
  llmApiKey: getEnv('LLM_API_KEY'),
  llmModel: getEnv('LLM_MODEL', 'gpt-4o-mini'),
  ocrApiUrl: getEnv('OCR_API_URL'),
  ocrApiKey: getEnv('OCR_API_KEY'),
  maxFileSize: 10 * 1024 * 1024
}
