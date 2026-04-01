import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { deliverySeeds } from '@/api/mock'
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

const STORAGE_KEY = 'intern-admin-deliveries'

function loadInitialData(): DeliveryItem[] {
  const cache = localStorage.getItem(STORAGE_KEY)
  const source = cache ? JSON.parse(cache) : deliverySeeds
  return source.map((item: DeliveryItem) => ({
    ...item,
    status: normalizeJobStatus(item.status),
    followUps: item.followUps || []
  }))
}

export const useDeliveryStore = defineStore('delivery', () => {
  const list = ref<DeliveryItem[]>(loadInitialData())
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
    upcomingInterview: list.value.filter((item) =>
      item.nextStep.includes('面试') ||
      interviewingStatuses.includes(item.status)
    ).length
  }))

  const highPriorityCount = computed(
    () => list.value.filter((item) => item.priority === '高优先级').length
  )

  const todoList = computed<TodoItem[]>(() => {
    const levelWeight: Record<TodoItem['level'], number> = { 紧急: 3, 优先: 2, 常规: 1 }
    return list.value
      .map((item) => {
        let level: TodoItem['level'] = '常规'
        if (item.priority === '高优先级' && interviewingStatuses.includes(item.status)) level = '紧急'
        else if (item.priority === '高优先级' || interviewingStatuses.includes(item.status)) level = '优先'
        return {
          id: item.id,
          title: `${item.companyName} · ${item.jobTitle}`,
          hint: item.nextStep,
          level
        }
      })
      .sort((a, b) => levelWeight[b.level] - levelWeight[a.level])
      .slice(0, 4)
  })

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.value))
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
    const map: Record<PriorityLevel, 'danger' | 'warning' | 'success'> = {
      高优先级: 'danger',
      正常跟进: 'warning',
      保底机会: 'success'
    }
    return map[priority]
  }

  return {
    list,
    total,
    statusChartData,
    trendChartData,
    dashboardStats,
    highPriorityCount,
    todoList,
    addDelivery,
    updateDelivery,
    removeDelivery,
    addFollowUp,
    transferDeliveryStatus,
    getPriorityTagType
  }
})
