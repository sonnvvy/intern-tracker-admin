import {
  API_CODE_BUSINESS,
  API_CODE_SYSTEM,
  handlePreflight,
  parseJsonBody,
  sendFail,
  sendOk
} from '../_lib/http.js'
import type { ApiRequest, ApiResponse } from '../_lib/http.js'
import { AIServiceError, createAIService } from '../_lib/ai/ai-service.js'

interface InterviewChatRequestBody {
  message?: unknown
  context?: unknown
  stream?: unknown
}

interface StreamApiResponse extends ApiResponse {
  write(chunk: string): void
  end(): void
  flushHeaders?: () => void
}

function sendError(res: ApiResponse, error: unknown): void {
  if (error instanceof AIServiceError) {
    sendFail(res, error.status, error.code, error.message)
    return
  }

  const message = error instanceof Error ? error.message : 'Internal Server Error'
  sendFail(res, 500, API_CODE_SYSTEM, message)
}

function acceptsStream(req: ApiRequest, body: InterviewChatRequestBody): boolean {
  const headers = (req.headers || {}) as Record<string, string | string[] | undefined>
  const accept = headers.accept
  const normalizedAccept = Array.isArray(accept) ? accept.join(',') : accept || ''

  return body.stream === true || normalizedAccept.includes('text/event-stream')
}

function writeStreamData(res: StreamApiResponse, data: string): void {
  res.write('data: ' + JSON.stringify(data) + '\n\n')
}

function writeStreamError(res: StreamApiResponse, message: string): void {
  res.write('event: error\n')
  res.write('data: ' + JSON.stringify({ message }) + '\n\n')
}

async function handleStream(body: InterviewChatRequestBody, res: StreamApiResponse): Promise<void> {
  res.status(200)
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.flushHeaders?.()

  try {
    for await (const delta of createAIService().interviewChatStream(body.message, body.context)) {
      writeStreamData(res, delta)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Stream failed'
    writeStreamError(res, message)
  } finally {
    res.write('data: [DONE]\n\n')
    res.end()
  }
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  if (handlePreflight(req, res)) return

  if (String(req.method || '').toUpperCase() !== 'POST') {
    sendFail(res, 405, API_CODE_BUSINESS, 'Method Not Allowed')
    return
  }

  let body: InterviewChatRequestBody
  try {
    body = await parseJsonBody<InterviewChatRequestBody>(req)
  } catch {
    sendFail(res, 400, API_CODE_BUSINESS, 'Request body must be valid JSON')
    return
  }

  if (acceptsStream(req, body)) {
    await handleStream(body, res as StreamApiResponse)
    return
  }

  try {
    const data = await createAIService().interviewChat(body.message, body.context)
    sendOk(res, data)
  } catch (error) {
    sendError(res, error)
  }
}