import { formatAIResponse, type ProcessedAIOutput } from './formatter.js'
import { parseLLMOutput } from './parser.js'

function tryParseJson(input: string): unknown | null {
  try {
    return JSON.parse(input) as unknown
  } catch {
    return null
  }
}

export function processAIOutput(raw: string): ProcessedAIOutput {
  try {
    const parsedText = parseLLMOutput(typeof raw === 'string' ? raw : '')

    if (!parsedText) {
      return formatAIResponse({
        success: false,
        data: '',
        error: 'Empty AI response'
      })
    }

    const parsedJson = tryParseJson(parsedText)
    return formatAIResponse(parsedJson !== null ? parsedJson : parsedText)
  } catch (error) {
    return formatAIResponse({
      success: false,
      data: typeof raw === 'string' ? raw.trim() : '',
      error: error instanceof Error ? error.message : 'Failed to process AI response'
    })
  }
}