import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchDeliveries as fetchDeliveriesRequest, type FetchDeliveriesParams } from '@/api/delivery'
import {
  JOB_STATUS,
  canTransfer,
  normalizeJobStatus,
  statusFlowOrder,
  statusLabelMap
} from '@/utils/statusMachine'
import type {
  DashboardStats,
  DeliveryItem,
  DeliveryStatus,
  FollowUpRecord,
  PriorityLevel,
  TodoItem
} from '@/types'

const HIGH_PRIORITY = '高优先级' as PriorityLevel
const URGENT_LEVEL = '紧急' as TodoItem['level']
const PRIORITY_LEVEL = '优先' as TodoItem['level']
const NORMAL_LEVEL = '常规' as TodoItem['level']

export const useDeliveryStore = defineStore('delivery', () => {
  const list = ref<DeliveryItem[]>([])
  const loading = ref(false)
  let latestRequestId = 0

  const interviewingStatuses: DeliveryStatus[] = [
    JOB_STATUS.WRITTEN_TEST,
    JOB_STATUS.FIRST_INTERVIEW,
    JOB_STATUS.SECOND_INTERVIEW
  ]
  const offeredStatuses: DeliveryStatus[] = [JOB_STATUS.OFFER, JOB_STATUS.HIRED]

  const total = computed(() => list.value.length)

  const statusChartData = computed(() => {
    const statusList: DeliveryStatus[] = statusFlowOrder
    return statusList.map((status) => ({
      name: statusLabelMap[status],
      value: list.value.filter((item) => item.status === status).length
    }))
  })

  const trendChartData = computed(() => {
    const counter = new Map<string, number>()
    list.value.forEach((item) => {
      const key = item.deliveryDate.slice(5)
      counter.set(key, (counter.get(key) || 0) + 1)
    })

    return [...counter.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, value]) => ({ date, value }))
  })

  const dashboardStats = computed<DashboardStats>(() => ({
    total: total.value,
    interviewing: list.value.filter((item) => interviewingStatuses.includes(item.status)).length,
    offered: list.value.filter((item) => offeredStatuses.includes(item.status)).length,
    rejected: list.value.filter((item) => item.status === JOB_STATUS.REJECTED).length,
    upcomingInterview: list.value.filter((item) => interviewingStatuses.includes(item.status)).length
  }))

  const highPriorityCount = computed(() => list.value.filter((item) => item.priority === HIGH_PRIORITY).length)

  const todoList = computed<TodoItem[]>(() => {
    const levelWeight = new Map<TodoItem['level'], number>([
      [URGENT_LEVEL, 3],
      [PRIORITY_LEVEL, 2],
      [NORMAL_LEVEL, 1]
    ])

    return list.value
      .map((item) => {
        let level = NORMAL_LEVEL
        if (item.priority === HIGH_PRIORITY && interviewingStatuses.includes(item.status)) level = URGENT_LEVEL
        else if (item.priority === HIGH_PRIORITY || interviewingStatuses.includes(item.status)) level = PRIORITY_LEVEL
        return {
          id: item.id,
          title: `${item.companyName} · ${item.jobTitle}`,
          hint: item.nextStep,
          level
        }
      })
      .sort((a, b) => (levelWeight.get(b.level) || 0) - (levelWeight.get(a.level) || 0))
      .slice(0, 4)
  })

  function persist() {
    localStorage.removeItem('intern-admin-deliveries')
  }

  function setDeliveries(payload: DeliveryItem[]) {
    list.value = payload.map((item) => ({
      ...item,
      status: normalizeJobStatus(item.status),
      followUps: item.followUps || []
    }))
    persist()
  }

  async function fetchDeliveries(params?: FetchDeliveriesParams) {
    const requestId = ++latestRequestId
    loading.value = true
    list.value = []
    try {
      const result = await fetchDeliveriesRequest(params)
      if (requestId === latestRequestId) setDeliveries(result.list)
      return result
    } finally {
      if (requestId === latestRequestId) loading.value = false
    }
  }

  function clearDeliveries() {
    latestRequestId += 1
    list.value = []
    loading.value = false
    persist()
  }

  function addDelivery(payload: Omit<DeliveryItem, 'id' | 'deliveryDate' | 'followUps'>) {
    list.value.unshift({
      ...payload,
      id: Date.now(),
      deliveryDate: new Date().toISOString().slice(0, 10),
      followUps: [
        {
          id: Date.now() + 1,
          date: new Date().toISOString().slice(0, 10),
          action: '新增记录',
          note: payload.nextStep
        }
      ]
    })
    persist()
  }

  function updateDelivery(payload: DeliveryItem) {
    const index = list.value.findIndex((item) => item.id === payload.id)
    if (index > -1) {
      list.value[index] = { ...payload }
      persist()
    }
  }

  function removeDelivery(id: number) {
    list.value = list.value.filter((item) => item.id !== id)
    persist()
  }

  function addFollowUp(deliveryId: number, record: Omit<FollowUpRecord, 'id'>) {
    const target = list.value.find((item) => item.id === deliveryId)
    if (!target) return
    target.followUps.unshift({ ...record, id: Date.now() })
    persist()
  }

  function transferDeliveryStatus(deliveryId: number, toStatus: DeliveryStatus) {
    const target = list.value.find((item) => item.id === deliveryId)
    if (!target) return { ok: false, message: '记录不存在' }

    const fromStatus = target.status
    if (!canTransfer(fromStatus, toStatus)) {
      return {
        ok: false,
        message: `非法流转：${statusLabelMap[fromStatus]} 不能流转到 ${statusLabelMap[toStatus]}`
      }
    }

    target.status = toStatus
    target.followUps.unshift({
      id: Date.now(),
      date: new Date().toISOString().slice(0, 10),
      action: `状态流转：${statusLabelMap[fromStatus]} -> ${statusLabelMap[toStatus]}`,
      note: '系统自动记录状态变更'
    })
    persist()
    return { ok: true, message: '状态更新成功' }
  }

  function getPriorityTagType(priority: PriorityLevel) {
    if (priority === HIGH_PRIORITY) return 'danger'
    return 'warning'
  }

  return {
    list,
    loading,
    total,
    statusChartData,
    trendChartData,
    dashboardStats,
    highPriorityCount,
    todoList,
    setDeliveries,
    fetchDeliveries,
    clearDeliveries,
    addDelivery,
    updateDelivery,
    removeDelivery,
    addFollowUp,
    transferDeliveryStatus,
    getPriorityTagType
  }
})
