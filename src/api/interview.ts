import { supabase } from '@/api/supabase'
import type { InterviewItem, InterviewResult } from '@/types'

interface InterviewRow {
  id: number
  user_id: string
  company: string
  position: string
  round: string
  interview_time: string | null
  interviewer_role: string | null
  result: string
  knowledge_tags: unknown
  note: string | null
  created_at: string
}

export interface FetchInterviewsParams {
  keyword?: string
  result?: string
}

export interface CreateInterviewPayload {
  company: string
  position: string
  round: string
  interview_time: string
  interviewer_role?: string
  result: InterviewResult
  knowledge_tags: string[] | string
  note?: string
}

const interviewResults: InterviewResult[] = ['待开始', '通过', '未通过', '待通知']

function normalizeResult(value: string): InterviewResult {
  return interviewResults.includes(value as InterviewResult)
    ? (value as InterviewResult)
    : '待通知'
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter(Boolean)
      .map(String)
      .map((item) => item.trim())
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(/[,，|、\s]+/)
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

function serializeTags(value: string[] | string): string {
  if (Array.isArray(value)) return normalizeTags(value).join(',')
  return value.trim()
}

function formatInterviewTime(value: string | null): string {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const pad = (part: number) => String(part).padStart(2, '0')
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`
  ].join(' ')
}

function mapInterviewRow(row: InterviewRow): InterviewItem {
  return {
    id: row.id,
    companyName: row.company,
    jobTitle: row.position,
    round: row.round,
    interviewDate: formatInterviewTime(row.interview_time || row.created_at),
    interviewer: row.interviewer_role || '待补充',
    result: normalizeResult(row.result),
    summary: row.note || '',
    questionTags: normalizeTags(row.knowledge_tags)
  }
}

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw new Error(error.message)
  if (!data.user) throw new Error('登录状态已失效，请重新登录')
  return data.user.id
}

function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

export async function fetchInterviews(params?: FetchInterviewsParams): Promise<InterviewItem[]> {
  const userId = await getCurrentUserId()
  let query = supabase
    .from('interviews')
    .select('*')
    .eq('user_id', userId)
    .order('interview_time', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  const keyword = params?.keyword?.trim()
  if (keyword) {
    const escapedKeyword = escapeFilterValue(keyword)
    query = query.or(
      `company.ilike."%${escapedKeyword}%",position.ilike."%${escapedKeyword}%",note.ilike."%${escapedKeyword}%"`
    )
  }

  const result = params?.result?.trim()
  if (result) query = query.eq('result', result)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return ((data || []) as InterviewRow[]).map(mapInterviewRow)
}

export async function createInterview(payload: CreateInterviewPayload): Promise<InterviewItem> {
  const userId = await getCurrentUserId()
  const interviewTime = new Date(payload.interview_time)

  const { data, error } = await supabase
    .from('interviews')
    .insert({
      user_id: userId,
      company: payload.company,
      position: payload.position,
      round: payload.round,
      interview_time: Number.isNaN(interviewTime.getTime())
        ? payload.interview_time
        : interviewTime.toISOString(),
      interviewer_role: payload.interviewer_role || '待补充',
      result: payload.result,
      knowledge_tags: serializeTags(payload.knowledge_tags),
      note: payload.note || ''
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return mapInterviewRow(data as InterviewRow)
}
