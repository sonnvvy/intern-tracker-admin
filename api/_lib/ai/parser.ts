function stripCodeFence(input: string): string {
  const trimmed = input.trim()
  const fullFenceMatch = trimmed.match(/^```(?:json|markdown|md)?\s*([\s\S]*?)\s*```$/i)

  if (fullFenceMatch?.[1]) {
    return fullFenceMatch[1].trim()
  }

  return trimmed
    .replace(/^```(?:json|markdown|md)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

function extractBalancedJson(input: string): string | null {
  const objectStart = input.indexOf('{')
  const arrayStart = input.indexOf('[')
  const starts = [objectStart, arrayStart].filter((index) => index >= 0)

  if (!starts.length) {
    return null
  }

  const start = Math.min(...starts)
  const openChar = input[start]
  const closeChar = openChar === '{' ? '}' : ']'
  let depth = 0
  let inString = false
  let escaped = false

  for (let i = start; i < input.length; i += 1) {
    const ch = input[i]

    if (escaped) {
      escaped = false
      continue
    }

    if (ch === '\\') {
      escaped = true
      continue
    }

    if (ch === '"') {
      inString = !inString
      continue
    }

    if (inString) {
      continue
    }

    if (ch === openChar) {
      depth += 1
    } else if (ch === closeChar) {
      depth -= 1
      if (depth === 0) {
        return input.slice(start, i + 1)
      }
    }
  }

  return null
}

function repairJsonLikeText(input: string): string {
  return input
    .replace(/^\uFEFF/, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, '$1')
    .trim()
}

export function parseLLMOutput(raw: string): string {
  if (typeof raw !== 'string') {
    return ''
  }

  const cleaned = repairJsonLikeText(stripCodeFence(raw))

  if (!cleaned) {
    return ''
  }

  try {
    const parsed = JSON.parse(cleaned) as unknown
    if (typeof parsed === 'string') {
      return repairJsonLikeText(stripCodeFence(parsed))
    }
    return cleaned
  } catch {
    const balancedJson = extractBalancedJson(cleaned)
    return balancedJson ? repairJsonLikeText(balancedJson) : cleaned
  }
}