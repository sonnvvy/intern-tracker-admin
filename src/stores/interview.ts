import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createInterview as createInterviewRequest,
  fetchInterviews as fetchInterviewsRequest,
  type CreateInterviewPayload,
  type FetchInterviewsParams
} from '@/api/interview'
import type { InterviewItem, InterviewResult } from '@/types'

export const useInterviewStore = defineStore('interview', () => {
  const list = ref<InterviewItem[]>([])
  const loading = ref(false)
  let latestRequestId = 0

  const upcomingCount = computed(
    () => list.value.filter((item) => item.result === '待开始' || item.result === '待通知').length
  )

  const tagFrequency = computed(() => {
    const map = new Map<string, number>()
    list.value.forEach((item) => {
      item.questionTags.forEach((tag) => map.set(tag, (map.get(tag) || 0) + 1))
    })
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }))
  })

  async function fetchInterviews(params?: FetchInterviewsParams) {
    const requestId = ++latestRequestId
    loading.value = true
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

  function getResultTagType(result: InterviewResult) {
    const map: Record<InterviewResult, 'info' | 'success' | 'danger' | 'warning'> = {
      待开始: 'info',
      通过: 'success',
      未通过: 'danger',
      待通知: 'warning'
    }
    return map[result]
  }

  return {
    list,
    loading,
    upcomingCount,
    tagFrequency,
    fetchInterviews,
    addInterview,
    getResultTagType
  }
})
