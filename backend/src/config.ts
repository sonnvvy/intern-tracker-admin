import dotenv from 'dotenv'

dotenv.config()

function getEnv(key: string, defaultValue = ''): string {
  const value = process.env[key]
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim()
  }
  return defaultValue
}

function requireEnv(key: string): string {
  const value = getEnv(key)
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

function getNumberEnv(key: string): number {
  const value = requireEnv(key)
  const numberValue = Number(value)
  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new Error(`Environment variable ${key} must be a positive integer`)
  }
  return numberValue
}

export const config = {
  port: getNumberEnv('PORT'),
  jwtSecret: requireEnv('JWT_SECRET'),
  frontendOrigins: [
    ...getEnv('FRONTEND_ORIGIN')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    'http://localhost:5173'
  ],
  mysql: {
    host: requireEnv('MYSQL_HOST'),
    port: getNumberEnv('MYSQL_PORT'),
    user: requireEnv('MYSQL_USER'),
    password: requireEnv('MYSQL_PASSWORD'),
    database: requireEnv('MYSQL_DATABASE')
  },
  llmApiUrl: getEnv('LLM_API_URL', getEnv('LLM_BASE_URL', 'https://api.openai.com/v1')),
  llmApiKey: getEnv('LLM_API_KEY'),
  llmModel: getEnv('LLM_MODEL', 'gpt-4o-mini'),
  ocrApiUrl: getEnv('OCR_API_URL'),
  ocrApiKey: getEnv('OCR_API_KEY'),
  maxFileSize: 10 * 1024 * 1024
}
