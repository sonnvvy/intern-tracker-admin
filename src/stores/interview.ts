import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { interviewSeeds } from '@/api/mock'
import type { InterviewItem, InterviewResult } from '@/types'

const STORAGE_KEY = 'intern-admin-interviews'

function loadInitialData(): InterviewItem[] {
  const cache = localStorage.getItem(STORAGE_KEY)
  return cache ? JSON.parse(cache) : interviewSeeds
}

export const useInterviewStore = defineStore('interview', () => {
  const list = ref<InterviewItem[]>(loadInitialData())

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

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.value))
  }

  function addInterview(payload: Omit<InterviewItem, 'id'>) {
    list.value.unshift({ ...payload, id: Date.now() })
    persist()
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
    upcomingCount,
    tagFrequency,
    addInterview,
    getResultTagType
  }
})
