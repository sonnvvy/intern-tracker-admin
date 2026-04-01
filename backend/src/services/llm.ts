import { config } from '../config.js'
import type { ResumeAnalysisResult } from '../types.js'
import { HttpError } from '../types.js'

interface LlmAnalyzeOutput {
  result: ResumeAnalysisResult
  rawContent: string
  rawResponse: unknown
}

function normalizeArray(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return []
  }

  return input
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0)
}

function normalizeResult(payload: unknown): ResumeAnalysisResult {
  const source = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}

  return {
    name: typeof source.name === 'string' ? source.name : '',
    education: typeof source.education === 'string' ? source.education : '',
    major: typeof source.major === 'string' ? source.major : '',
    skills: normalizeArray(source.skills),
    projects: normalizeArray(source.projects),
    internships: normalizeArray(source.internships),
    jobDirections: normalizeArray(source.jobDirections),
    advice: normalizeArray(source.advice)
  }
}

function extractJsonCandidates(content: string): string[] {
  const candidates: string[] = []

  const fenced = content.match(/```json\s*([\s\S]*?)\s*```/i)
  if (fenced?.[1]) {
    candidates.push(fenced[1].trim())
  }

  const firstIndex = content.indexOf('{')
  const lastIndex = content.lastIndexOf('}')
  if (firstIndex !== -1 && lastIndex !== -1 && lastIndex > firstIndex) {
    candidates.push(content.slice(firstIndex, lastIndex + 1).trim())
  }

  candidates.push(content.trim())
  return candidates
}

function parseJsonFromText(content: string): unknown {
  const candidates = extractJsonCandidates(content)

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as unknown
    } catch {
      continue
    }
  }

  throw new HttpError(502, '大模型返回 JSON 解析失败')
}

export async function analyzeResumeByLlm(resumeText: string): Promise<LlmAnalyzeOutput> {
  if (!config.llmApiKey) {
    throw new HttpError(500, 'LLM 服务未配置，请联系管理员配置 LLM_API_KEY')
  }

  const prompt = `你是简历结构化提取助手。请从简历文本中提取字段，并严格返回 JSON，不要输出额外说明。\n\n字段要求：\n- name: string\n- education: string\n- major: string\n- skills: string[]\n- projects: string[]\n- internships: string[]\n- jobDirections: string[]\n- advice: string[]\n\n缺失时：string 返回 \"\"，array 返回 []，不得缺少 key。\n\n简历文本：\n${resumeText}`

  const endpoint = `${config.llmApiUrl.replace(/\/+$/, '')}/chat/completions`
  const requestBody = {
    model: config.llmModel,
    temperature: 0.2,
    messages: [
      { role: 'system', content: '你只能输出合法 JSON。' },
      { role: 'user', content: prompt }
    ]
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.llmApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  const rawResponse: unknown = await response.json().catch(async () => {
    const text = await response.text().catch(() => '')
    return { raw: text }
  })

  if (!response.ok) {
    const detail = typeof rawResponse === 'object' ? JSON.stringify(rawResponse) : String(rawResponse)
    throw new HttpError(502, `LLM 服务调用失败：${response.status} ${response.statusText} ${detail}`)
  }

  const content =
    rawResponse && typeof rawResponse === 'object'
      ? (rawResponse as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content
      : undefined

  if (!content || typeof content !== 'string') {
    throw new HttpError(502, '大模型未返回内容')
  }

  const rawResult = parseJsonFromText(content)
  return {
    result: normalizeResult(rawResult),
    rawContent: content,
    rawResponse
  }
}
