function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]'
}

function hasUsableValue(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.trim().length > 0
  }

  if (typeof value === 'number') {
    return Number.isFinite(value)
  }

  if (typeof value === 'boolean') {
    return true
  }

  if (Array.isArray(value)) {
    return value.some(hasUsableValue)
  }

  if (isPlainObject(value)) {
    return Object.values(value).some(hasUsableValue)
  }

  return false
}

function hasKnownAIShape(value: Record<string, unknown>): boolean {
  const knownFields = [
    'answer',
    'rawText',
    'summary',
    'matchScore',
    'missingSkills',
    'resumeImprovements',
    'interviewPrep',
    'skills',
    'projects',
    'advice'
  ]

  return knownFields.some((field) => field in value)
}

export function validateAIResponse(data: unknown): boolean {
  if (data === null || typeof data === 'undefined') {
    return false
  }

  if (typeof data === 'function' || typeof data === 'symbol') {
    return false
  }

  if (typeof data === 'string') {
    return data.trim().length > 0
  }

  if (typeof data === 'number') {
    return Number.isFinite(data)
  }

  if (Array.isArray(data)) {
    return data.length > 0 && data.some(hasUsableValue)
  }

  if (isPlainObject(data)) {
    const keys = Object.keys(data)
    if (!keys.length) {
      return false
    }

    if (hasKnownAIShape(data)) {
      return hasUsableValue(data)
    }

    return keys.some((key) => hasUsableValue(data[key]))
  }

  return true
}