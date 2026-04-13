import axios from 'axios'

export type AppErrorLevel = 'network' | 'permission' | 'business' | 'system'

export interface AppError extends Error {
  level: AppErrorLevel
  status?: number
  code?: number
  raw?: unknown
}

interface ErrorPayload {
  code?: unknown
  message?: unknown
  detail?: unknown
}

const levelDefaultMessage: Record<AppErrorLevel, string> = {
  network: '网络异常，请检查网络连接后重试',
  permission: '登录状态失效，请重新登录后再试',
  business: '请求未通过，请检查输入后重试',
  system: '系统繁忙，请稍后重试'
}

function parseErrorCode(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return undefined
}

function pickPayloadMessage(payload: ErrorPayload | undefined): string | undefined {
  if (typeof payload?.message === 'string' && payload.message.trim()) {
    return payload.message
  }

  if (typeof payload?.detail === 'string' && payload.detail.trim()) {
    return payload.detail
  }

  return undefined
}

function classifyByStatus(status: number): AppErrorLevel {
  if (status === 401 || status === 403) {
    return 'permission'
  }

  if (status >= 500) {
    return 'system'
  }

  return 'business'
}

export function createAppError(
  level: AppErrorLevel,
  message?: string,
  extra?: { status?: number; code?: number; raw?: unknown }
): AppError {
  const appError = new Error(message || levelDefaultMessage[level]) as AppError
  appError.level = level
  appError.status = extra?.status
  appError.code = extra?.code
  appError.raw = extra?.raw
  return appError
}

export function toAppError(error: unknown, fallbackMessage?: string): AppError {
  if (error instanceof Error && 'level' in error) {
    return error as AppError
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    const payload = error.response?.data as ErrorPayload | undefined
    const code = parseErrorCode(payload?.code)

    if (typeof status !== 'number') {
      return createAppError('network', fallbackMessage || levelDefaultMessage.network, {
        code,
        raw: error
      })
    }

    const level = classifyByStatus(status)
    const payloadMessage = pickPayloadMessage(payload)
    const message =
      level === 'business'
        ? payloadMessage || fallbackMessage || levelDefaultMessage.business
        : fallbackMessage || levelDefaultMessage[level]

    return createAppError(level, message, {
      status,
      code,
      raw: error
    })
  }

  if (error instanceof Error) {
    return createAppError('system', fallbackMessage || error.message || levelDefaultMessage.system, {
      raw: error
    })
  }

  return createAppError('system', fallbackMessage || levelDefaultMessage.system, {
    raw: error
  })
}

export function getErrorDisplayMessage(error: unknown, fallbackMessage?: string): string {
  const appError = toAppError(error, fallbackMessage)

  if (appError.level === 'business' && appError.message) {
    return appError.message
  }

  return levelDefaultMessage[appError.level]
}
