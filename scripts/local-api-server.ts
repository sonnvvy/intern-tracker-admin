import { config as loadEnv } from 'dotenv'
import { createServer } from 'node:http'
import { createChatModel } from '../api/_lib/langchain'
import { chatAssistantPrompt, jobAdvicePrompt } from '../api/_lib/prompts'
import { chatAssistantSchema, jobAdviceSchema } from '../api/_lib/schemas'
import { invokeJsonWithSchema } from '../api/_lib/structured-output'

// Prefer .env.local for local development, then fallback to .env
loadEnv({ path: '.env.local' })
loadEnv()

const port = Number(process.env.LOCAL_API_PORT || 3000)

function sendJson(res: import('node:http').ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

async function readJsonBody(req: import('node:http').IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim()
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
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

    if (req.method === 'POST' && req.url === '/api/chat') {
      const body = await readJsonBody(req)
      const question = typeof body.question === 'string' ? body.question.trim() : ''
      if (!question) {
        sendJson(res, 400, { message: 'question is required' })
        return
      }

      const model = createChatModel()
      const data = await invokeJsonWithSchema({
        prompt: chatAssistantPrompt,
        model,
        input: { question },
        schema: chatAssistantSchema
      })

      sendJson(res, 200, {
        data,
        meta: {
          model: process.env.DEEPSEEK_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini',
          runtime: 'local-api-server'
        }
      })
      return
    }

    if (req.method === 'POST' && req.url === '/api/job-advice') {
      const body = await readJsonBody(req)
      const jd = typeof body.jd === 'string' ? body.jd.trim() : ''
      const resumeText = typeof body.resumeText === 'string' ? body.resumeText.trim() : ''

      if (!jd || !resumeText) {
        sendJson(res, 400, { message: 'jd and resumeText are required' })
        return
      }

      const model = createChatModel()
      const data = await invokeJsonWithSchema({
        prompt: jobAdvicePrompt,
        model,
        input: { jd, resumeText },
        schema: jobAdviceSchema
      })

      sendJson(res, 200, {
        data,
        meta: {
          model: process.env.DEEPSEEK_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini',
          runtime: 'local-api-server'
        }
      })
      return
    }

    sendJson(res, 404, { message: 'Not Found' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    sendJson(res, 500, { message })
  }
})

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[local-api-server] http://localhost:${port}`)
})
