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
  message: string
}

export function setJsonHeaders(res: ApiResponse): void {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
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
  setJsonHeaders(res)
  res.status(405).json({ message: 'Method Not Allowed' } satisfies ApiError)
}

export function badRequest(res: ApiResponse, message: string): void {
  setJsonHeaders(res)
  res.status(400).json({ message } satisfies ApiError)
}

export function internalError(res: ApiResponse, error: unknown): void {
  const message = error instanceof Error ? error.message : 'Internal Server Error'
  setJsonHeaders(res)
  res.status(500).json({ message } satisfies ApiError)
}
