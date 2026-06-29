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
}

function sendError(res: ApiResponse, error: unknown): void {
  if (error instanceof AIServiceError) {
    sendFail(res, error.status, error.code, error.message)
    return
  }

  const message = error instanceof Error ? error.message : 'Internal Server Error'
  sendFail(res, 500, API_CODE_SYSTEM, message)
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

  try {
    const data = await createAIService().interviewChat(body.message, body.context)
    sendOk(res, data)
  } catch (error) {
    sendError(res, error)
  }
}