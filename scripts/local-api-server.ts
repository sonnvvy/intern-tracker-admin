import { config as loadEnv } from 'dotenv'
import { createServer } from 'node:http'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { createChatModel } from '../api/_lib/langchain'
import { chatAssistantPrompt, jobAdvicePrompt } from '../api/_lib/prompts'
import { chatAssistantSchema, jobAdviceSchema } from '../api/_lib/schemas'
import { invokeJsonWithSchema } from '../api/_lib/structured-output'
import { z } from 'zod'

// Prefer .env.local for local development, then fallback to .env
loadEnv({ path: '.env.local' })
loadEnv()

const port = Number(process.env.LOCAL_API_PORT || 3000)

const resumeAnalysisSchema = z.object({
  name: z.string().default(''),
  education: z.string().default(''),
  major: z.string().default(''),
  skills: z.array(z.string()).default([]),
  projects: z.array(z.string()).default([]),
  internships: z.array(z.string()).default([]),
  jobDirections: z.array(z.string()).default([]),
  advice: z.array(z.string()).default([])
})

const resumeAnalysisPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    '你是专业的简历分析助手，请提取技能、项目亮点、优势、待优化点，并尽量返回结构化 JSON。'
  ],
  [
    'human',
    [
      '简历文本：\n{resumeText}',
      '请只输出 JSON，不要 markdown，不要代码块。',
      '字段必须是：name, education, major, skills, projects, internships, jobDirections, advice。'
    ].join('\n\n')
  ]
])

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

    if (req.method === 'POST' && (req.url === '/api/ai/interview-chat' || req.url === '/api/chat')) {
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
        success: true,
        data,
        meta: {
          model: process.env.DEEPSEEK_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini',
          runtime: 'local-api-server',
          deprecated: req.url === '/api/chat'
        }
      })
      return
    }

    if (req.method === 'POST' && req.url === '/api/ai/analyze-resume') {
      const body = await readJsonBody(req)
      const resumeText = typeof body.resumeText === 'string' ? body.resumeText.trim() : ''

      if (!resumeText) {
        sendJson(res, 400, { success: false, message: 'resumeText is required' })
        return
      }

      const model = createChatModel()
      const data = await invokeJsonWithSchema({
        prompt: resumeAnalysisPrompt,
        model,
        input: { resumeText },
        schema: resumeAnalysisSchema
      })

      sendJson(res, 200, {
        success: true,
        data,
        meta: {
          model: process.env.DEEPSEEK_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini',
          runtime: 'local-api-server'
        }
      })
      return
    }

    if (req.method === 'POST' && (req.url === '/api/ai/job-match' || req.url === '/api/job-advice')) {
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
        success: true,
        data,
        meta: {
          model: process.env.DEEPSEEK_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini',
          runtime: 'local-api-server',
          deprecated: req.url === '/api/job-advice'
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
