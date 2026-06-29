import { validateAIResponse } from './validator.js'

export interface ProcessedAIOutput {
  success: boolean
  data: unknown
  error?: string
}

function normalizeData(input: unknown): unknown {
  if (typeof input === 'string') {
    return input.trim()
  }

  if (Array.isArray(input)) {
    return input
  }

  if (input && typeof input === 'object') {
    return input
  }

  return input ?? ''
}

export function formatAIResponse(input: unknown): ProcessedAIOutput {
  if (input && typeof input === 'object' && 'success' in input && typeof (input as { success?: unknown }).success === 'boolean') {
    const payload = input as { success: boolean; data?: unknown; error?: unknown }
    const data = normalizeData(payload.data)

    return {
      success: payload.success && validateAIResponse(data),
      data,
      ...(typeof payload.error === 'string' && payload.error.trim() ? { error: payload.error.trim() } : {})
    }
  }

  const data = normalizeData(input)
  const isValid = validateAIResponse(data)

  if (!isValid) {
    return {
      success: false,
      data: '',
      error: 'Empty or invalid AI response'
    }
  }

  return {
    success: true,
    data
  }
}