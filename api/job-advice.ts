import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createChatModel } from './_lib/langchain'
import { badRequest, internalError, methodNotAllowed, parseJsonBody, setJsonHeaders } from './_lib/http'
import { jobAdvicePrompt } from './_lib/prompts'
import { jobAdviceSchema } from './_lib/schemas'
import { invokeJsonWithSchema } from './_lib/structured-output'

interface JobAdviceRequestBody {
  jd?: string
  resumeText?: string
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    methodNotAllowed(res)
    return
  }

  try {
    const body = await parseJsonBody<JobAdviceRequestBody>(req)
    const jd = body.jd?.trim()
    const resumeText = body.resumeText?.trim()

    if (!jd || !resumeText) {
      badRequest(res, 'jd and resumeText are required')
      return
    }

    const model = createChatModel()
    const result = await invokeJsonWithSchema({
      prompt: jobAdvicePrompt,
      model,
      input: { jd, resumeText },
      schema: jobAdviceSchema
    })

    setJsonHeaders(res)
    res.status(200).json({
      data: result,
      meta: {
        model: process.env.DEEPSEEK_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini'
      }
    })
  } catch (error) {
    internalError(res, error)
  }
}
