import DOMPurify from 'dompurify'
import MarkdownIt from 'markdown-it'

const markdown = new MarkdownIt({
  breaks: true,
  html: false,
  linkify: true,
  typographer: true
})

function stringifyDisplayValue(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  if (value === null || typeof value === 'undefined') {
    return ''
  }

  if (Array.isArray(value)) {
    return value.map(stringifyDisplayValue).filter(Boolean).join('\n')
  }

  if (typeof value === 'object') {
    const source = value as Record<string, unknown>
    const candidateFields = ['answer', 'text', 'data', 'content', 'summary', 'rawText', 'message']

    for (const field of candidateFields) {
      const fieldValue = source[field]
      const text = stringifyDisplayValue(fieldValue)
      if (text.trim()) {
        return text
      }
    }

    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return ''
    }
  }

  return String(value)
}

export function renderMarkdownContent(value: unknown): string {
  const text = stringifyDisplayValue(value).trim()
  if (!text) {
    return ''
  }

  return DOMPurify.sanitize(markdown.render(text), {
    USE_PROFILES: { html: true }
  })
}