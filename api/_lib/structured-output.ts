import { StringOutputParser } from '@langchain/core/output_parsers'
import type { ChatPromptTemplate } from '@langchain/core/prompts'
import type { ChatOpenAI } from '@langchain/openai'
import type { ZodType } from 'zod'

function extractJsonBlock(text: string): string {
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i)
  if (fenced?.[1]) {
    return fenced[1].trim()
  }

  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1).trim()
  }

  return text.trim()
}

export async function invokeJsonWithSchema<T>(params: {
  prompt: ChatPromptTemplate
  model: ChatOpenAI
  input: Record<string, string>
  schema: ZodType<T>
  normalize?: (value: unknown) => T
}): Promise<T> {
  const chain = params.prompt.pipe(params.model).pipe(new StringOutputParser())
  const rawText = await chain.invoke(params.input)
  const jsonText = extractJsonBlock(rawText)

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error('Model did not return valid JSON')
  }

  const validated = params.schema.safeParse(parsed)
  if (validated.success) {
    return validated.data
  }

  if (params.normalize) {
    return params.normalize(parsed)
  }

  throw new Error('Model JSON format is invalid')
}
