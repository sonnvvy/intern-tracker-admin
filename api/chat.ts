import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createChatModel } from './_lib/langchain'
import { chatAssistantPrompt } from './_lib/prompts'
import { chatAssistantSchema } from './_lib/schemas'
import { invokeJsonWithSchema } from './_lib/structured-output'
import { badRequest, internalError, methodNotAllowed, parseJsonBody, setJsonHeaders } from './_lib/http'

interface ChatRequestBody {
  question?: string
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    methodNotAllowed(res)
    return
  }

  try {
    const body = await parseJsonBody<ChatRequestBody>(req)
    const question = body.question?.trim()

    if (!question) {
      badRequest(res, 'question is required')
      return
    }

    const model = createChatModel()
    const result = await invokeJsonWithSchema({
      prompt: chatAssistantPrompt,
      model,
      input: { question },
      schema: chatAssistantSchema
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
