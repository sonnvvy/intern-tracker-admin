import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createInterview as createInterviewRequest,
  fetchInterviews as fetchInterviewsRequest,
  type CreateInterviewPayload,
  type FetchInterviewsParams
} from '@/api/interview'
import type { InterviewItem, InterviewResult } from '@/types'

const PENDING_START = '待开始' as InterviewResult
const PASSED = '通过' as InterviewResult
const FAILED = '未通过' as InterviewResult
const PENDING_NOTICE = '待通知' as InterviewResult

export const useInterviewStore = defineStore('interview', () => {
  const list = ref<InterviewItem[]>([])
  const loading = ref(false)
  let latestRequestId = 0

  const upcomingCount = computed(
    () => list.value.filter((item) => item.result === PENDING_START || item.result === PENDING_NOTICE).length
  )

  const tagFrequency = computed(() => {
    const map = new Map<string, number>()
    list.value.forEach((item) => {
      const tags = Array.isArray(item.questionTags) ? item.questionTags : []
      tags.forEach((tag) => map.set(tag, (map.get(tag) || 0) + 1))
    })
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }))
  })

  async function fetchInterviews(params?: FetchInterviewsParams) {
    const requestId = ++latestRequestId
    loading.value = true
    list.value = []
    try {
      const data = await fetchInterviewsRequest(params)
      if (requestId === latestRequestId) list.value = data
      return data
    } finally {
      if (requestId === latestRequestId) loading.value = false
    }
  }

  async function addInterview(payload: CreateInterviewPayload) {
    const created = await createInterviewRequest(payload)
    list.value.unshift(created)
    return created
  }

  function clearInterviews() {
    latestRequestId += 1
    list.value = []
    loading.value = false
  }

  function getResultTagType(result: InterviewResult) {
    const map: Record<string, 'info' | 'success' | 'danger' | 'warning'> = {
      [PENDING_START]: 'info',
      [PASSED]: 'success',
      [FAILED]: 'danger',
      [PENDING_NOTICE]: 'warning'
    }
    return map[String(result)] || 'info'
  }

  return {
    list,
    loading,
    upcomingCount,
    tagFrequency,
    fetchInterviews,
    addInterview,
    clearInterviews,
    getResultTagType
  }
})
