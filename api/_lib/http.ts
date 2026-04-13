export interface ApiRequest {
  method?: string
  body?: unknown
  [key: string]: unknown
  [Symbol.asyncIterator](): AsyncIterator<unknown>
}

export interface ApiResponse {
  status(code: number): ApiResponse
  json(body: unknown): void
  setHeader(name: string, value: string): void
}

export interface ApiError {
  code: number
  message: string
}

export interface ApiEnvelope<T> {
  code: number
  message: string
  data: T | null
}

export const API_CODE_OK = 0
export const API_CODE_PERMISSION = 1401
export const API_CODE_BUSINESS = 1400
export const API_CODE_SYSTEM = 1500
export const API_CODE_UPSTREAM = 1001

function setCorsHeaders(res: ApiResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

export function setJsonHeaders(res: ApiResponse): void {
  setCorsHeaders(res)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
}

export function handlePreflight(req: ApiRequest, res: ApiResponse): boolean {
  if (req.method !== 'OPTIONS') {
    return false
  }

  setCorsHeaders(res)
  res.status(204).json(null)
  return true
}

export async function parseJsonBody<T>(req: ApiRequest): Promise<T> {
  if (req.body && typeof req.body === 'object') {
    return req.body as T
  }

  if (typeof req.body === 'string') {
    return JSON.parse(req.body) as T
  }

  const chunks: Uint8Array[] = []
  const encoder = new TextEncoder()
  for await (const chunk of req) {
    if (chunk instanceof Uint8Array) {
      chunks.push(chunk)
    } else if (typeof chunk === 'string') {
      chunks.push(encoder.encode(chunk))
    } else {
      chunks.push(encoder.encode(String(chunk ?? '')))
    }
  }

  const totalLength = chunks.reduce((sum, part) => sum + part.length, 0)
  const merged = new Uint8Array(totalLength)
  let offset = 0
  for (const part of chunks) {
    merged.set(part, offset)
    offset += part.length
  }

  const raw = new TextDecoder().decode(merged)
  if (!raw) {
    return {} as T
  }

  return JSON.parse(raw) as T
}

export function methodNotAllowed(res: ApiResponse): void {
  sendFail(res, 405, API_CODE_BUSINESS, 'Method Not Allowed')
}

export function badRequest(res: ApiResponse, message: string): void {
  sendFail(res, 400, API_CODE_BUSINESS, message)
}

export function internalError(res: ApiResponse, error: unknown): void {
  const message = error instanceof Error ? error.message : 'Internal Server Error'
  sendFail(res, 500, API_CODE_SYSTEM, message)
}

export function sendOk<T>(res: ApiResponse, data: T, message = 'ok'): void {
  setJsonHeaders(res)
  res.status(200).json({
    code: API_CODE_OK,
    message,
    data
  } satisfies ApiEnvelope<T>)
}

export function sendFail(res: ApiResponse, status: number, code: number, message: string): void {
  setJsonHeaders(res)
  res.status(status).json({
    code,
    message,
    data: null
  } satisfies ApiEnvelope<null>)
}
