import type { DeliveryItem, PriorityLevel } from '@/types'
import { supabase } from '@/api/supabase'
import { JOB_STATUS, normalizeJobStatus } from '@/utils/statusMachine'

interface DeliveryRow {
  id: number
  company: string
  position: string
  status: string
  created_at: string | Date
  city?: string | null
  channel?: string | null
  apply_date?: string | Date | null
  note?: string | null
}

export interface SaveDeliveryPayload {
  company: string
  position: string
  status: string
  city?: string
  channel?: string
  apply_date?: string
  note?: string
}

export interface FetchDeliveriesParams {
  keyword?: string
  status?: string
  page?: number
  pageSize?: number
}

export interface FetchDeliveriesResult {
  list: DeliveryItem[]
  total: number
  page: number
  pageSize: number
}

const DEFAULT_PRIORITY = '正常跟进' as PriorityLevel

function formatDeliveryDate(value?: string | Date | null): string {
  if (!value) return new Date().toISOString().slice(0, 10)

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10)
  }

  return date.toISOString().slice(0, 10)
}

function mapDeliveryRow(item: DeliveryRow): DeliveryItem {
  return {
    id: item.id,
    companyName: item.company,
    jobTitle: item.position,
    channel: item.channel || '-',
    status: normalizeJobStatus(item.status || JOB_STATUS.APPLIED),
    deliveryDate: formatDeliveryDate(item.apply_date || item.created_at),
    city: item.city || '-',
    priority: DEFAULT_PRIORITY,
    nextStep: '等待后续进展',
    remark: item.note || '',
    followUps: [
      {
        id: item.id,
        date: formatDeliveryDate(item.created_at),
        action: '完成投递',
        note: '来自 Supabase deliveries 表'
      }
    ]
  }
}

export async function fetchDeliveries(params?: FetchDeliveriesParams): Promise<FetchDeliveriesResult> {
  const page = Math.max(params?.page || 1, 1)
  const pageSize = Math.max(params?.pageSize || 10, 1)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('deliveries')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  const keyword = params?.keyword?.trim()
  if (keyword) {
    const escapedKeyword = keyword.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    query = query.or(
      `company.ilike."%${escapedKeyword}%",position.ilike."%${escapedKeyword}%"`
    )
  }

  const status = params?.status?.trim()
  if (status) {
    query = query.eq('status', status)
  }

  const { data, count, error } = await query
  if (error) {
    throw new Error(error.message)
  }

  return {
    list: (data as DeliveryRow[] | null)?.map(mapDeliveryRow) || [],
    total: count || 0,
    page,
    pageSize
  }
}

export async function createDelivery(payload: SaveDeliveryPayload) {
  const { data, error } = await supabase
    .from('deliveries')
    .insert({
      company: payload.company,
      position: payload.position,
      status: payload.status,
      city: payload.city,
      channel: payload.channel,
      apply_date: payload.apply_date,
      note: payload.note
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function updateDelivery(id: number, payload: SaveDeliveryPayload) {
  const { data, error } = await supabase
    .from('deliveries')
    .update({
      company: payload.company,
      position: payload.position,
      status: payload.status,
      city: payload.city,
      channel: payload.channel,
      apply_date: payload.apply_date,
      note: payload.note
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function deleteDelivery(id: number) {
  const { data, error } = await supabase
    .from('deliveries')
    .delete()
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function updateDeliveryStatus(id: number, status: string) {
  const { data, error } = await supabase
    .from('deliveries')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}
