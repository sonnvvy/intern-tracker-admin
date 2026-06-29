import { config as loadEnv } from 'dotenv'
import { createServer } from 'node:http'
import { ReadableStream, TransformStream } from 'node:stream/web'
import { API_CODE_BUSINESS, API_CODE_SYSTEM, type ApiEnvelope } from '../api/_lib/http.js'
import { AIServiceError, createAIService } from '../api/_lib/ai/ai-service.js'

const webStreamGlobals = globalThis as Record<string, unknown>

webStreamGlobals.ReadableStream ??= ReadableStream
webStreamGlobals.TransformStream ??= TransformStream

// Prefer .env.local for local development, then fallback to .env
loadEnv({ path: '.env.local' })
loadEnv()

const port = Number(process.env.LOCAL_API_PORT || 3000)

function sendJson(res: import('node:http').ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function sendOk<T>(res: import('node:http').ServerResponse, data: T): void {
  sendJson(res, 200, {
    code: 0,
    message: 'ok',
    data
  } satisfies ApiEnvelope<T>)
}

function sendFail(res: import('node:http').ServerResponse, statusCode: number, code: number, message: string): void {
  sendJson(res, statusCode, {
    code,
    message,
    data: null
  } satisfies ApiEnvelope<null>)
}

function sendError(res: import('node:http').ServerResponse, error: unknown): void {
  if (error instanceof AIServiceError) {
    sendFail(res, error.status, error.code, error.message)
    return
  }

  const message = error instanceof Error ? error.message : 'Internal Server Error'
  sendFail(res, 500, API_CODE_SYSTEM, message)
}

async function readJsonBody(req: import('node:http').IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim()
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
}

async function readBodyOrFail(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) {
  try {
    return await readJsonBody(req)
  } catch {
    sendFail(res, 400, API_CODE_BUSINESS, 'Request body must be valid JSON')
    return null
  }
}

const server = createServer(async (req, res) => {
  try {
    if (!req.url || !req.method) {
      sendJson(res, 404, { message: 'Not Found' })
      return
    }

    if (req.method === 'GET' && req.url === '/api/health') {
      sendJson(res, 200, { status: 'ok' })
      return
    }

    if (req.method === 'POST' && (req.url === '/api/ai/interview-chat' || req.url === '/api/chat')) {
      const body = await readBodyOrFail(req, res)
      if (!body) return

      const message = typeof body.message === 'string' ? body.message : body.question
      const data = await createAIService().interviewChat(message, body.context)
      sendOk(res, data)
      return
    }

    if (req.method === 'POST' && req.url === '/api/ai/analyze-resume') {
      const body = await readBodyOrFail(req, res)
      if (!body) return

      const data = await createAIService().resumeAnalysis(body.resumeText)
      sendOk(res, data)
      return
    }

    if (req.method === 'POST' && (req.url === '/api/ai/job-match' || req.url === '/api/job-advice')) {
      const body = await readBodyOrFail(req, res)
      if (!body) return

      const data = await createAIService().jobMatch(body)
      sendOk(res, data)
      return
    }

    sendJson(res, 404, { message: 'Not Found' })
  } catch (error) {
    sendError(res, error)
  }
})

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[local-api-server] http://localhost:${port}`)
})