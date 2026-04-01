import type { VercelRequest, VercelResponse } from '@vercel/node'

export interface ApiError {
  message: string
}

export function setJsonHeaders(res: VercelResponse): void {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
}

export async function parseJsonBody<T>(req: VercelRequest): Promise<T> {
  if (req.body && typeof req.body === 'object') {
    return req.body as T
  }

  if (typeof req.body === 'string') {
    return JSON.parse(req.body) as T
  }

  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) {
    return {} as T
  }

  return JSON.parse(raw) as T
}

export function methodNotAllowed(res: VercelResponse): void {
  setJsonHeaders(res)
  res.status(405).json({ message: 'Method Not Allowed' } satisfies ApiError)
}

export function badRequest(res: VercelResponse, message: string): void {
  setJsonHeaders(res)
  res.status(400).json({ message } satisfies ApiError)
}

export function internalError(res: VercelResponse, error: unknown): void {
  const message = error instanceof Error ? error.message : 'Internal Server Error'
  setJsonHeaders(res)
  res.status(500).json({ message } satisfies ApiError)
}
