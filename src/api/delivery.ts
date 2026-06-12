import axios from 'axios'
import type { DeliveryItem } from '@/types'
import { JOB_STATUS, normalizeJobStatus } from '@/utils/statusMachine'

interface BackendDelivery {
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

interface FetchDeliveriesParams {
  keyword?: string
  status?: string
  page?: number
  pageSize?: number
}

interface BackendDeliveryPage {
  list: BackendDelivery[]
  total: number
  page: number
  pageSize: number
}

export interface FetchDeliveriesResult {
  list: DeliveryItem[]
  total: number
  page: number
  pageSize: number
}

const deliveryClient = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:3001'
})

function formatDeliveryDate(value?: string | Date | null): string {
  if (!value) return new Date().toISOString().slice(0, 10)

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10)
  }

  return date.toISOString().slice(0, 10)
}

function mapBackendDelivery(item: BackendDelivery): DeliveryItem {
  return {
    id: item.id,
    companyName: item.company,
    jobTitle: item.position,
    channel: item.channel || '-',
    status: normalizeJobStatus(item.status || JOB_STATUS.APPLIED),
    deliveryDate: formatDeliveryDate(item.apply_date || item.created_at),
    city: item.city || '-',
    priority: '正常跟进',
    nextStep: '等待后续进展',
    remark: item.note || '',
    followUps: [
      {
        id: item.id,
        date: formatDeliveryDate(item.created_at),
        action: '完成投递',
        note: '来自后端 deliveries 表'
      }
    ]
  }
}

export async function fetchDeliveries(params?: FetchDeliveriesParams): Promise<FetchDeliveriesResult> {
  const { data } = await deliveryClient.get<BackendDeliveryPage>('/deliveries', { params })
  const list = Array.isArray(data.list) ? data.list.map(mapBackendDelivery) : []
  return {
    list,
    total: Number(data.total || 0),
    page: Number(data.page || params?.page || 1),
    pageSize: Number(data.pageSize || params?.pageSize || 10)
  }
}

export async function createDelivery(payload: SaveDeliveryPayload) {
  const { data } = await deliveryClient.post('/deliveries', payload)
  return data
}

export async function updateDelivery(id: number, payload: SaveDeliveryPayload) {
  const { data } = await deliveryClient.put(`/deliveries/${id}`, payload)
  return data
}

export async function deleteDelivery(id: number) {
  const { data } = await deliveryClient.delete(`/deliveries/${id}`)
  return data
}

export async function updateDeliveryStatus(id: number, status: string) {
  const { data } = await deliveryClient.put(`/deliveries/${id}`, { status })
  return data
}
