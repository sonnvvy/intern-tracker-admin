<template>
  <el-tag :type="tagType" :effect="effect"><slot>{{ displayText }}</slot></el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DeliveryStatus, InterviewResult, PriorityLevel } from '@/types'
import { normalizeJobStatus, statusLabelMap, statusTagTypeMap } from '@/utils/statusMachine'

const props = withDefaults(
  defineProps<{
    text: DeliveryStatus | InterviewResult | PriorityLevel | string
    mode?: 'delivery' | 'interview' | 'priority'
    effect?: 'light' | 'dark' | 'plain'
  }>(),
  { mode: 'delivery', effect: 'light' }
)

const tagType = computed(() => {
  if (props.mode === 'priority') {
    const map: Record<string, 'danger' | 'warning' | 'success'> = {
      高优先级: 'danger',
      正常跟进: 'warning',
      保底机会: 'success'
    }
    return map[props.text] || 'info'
  }
  if (props.mode === 'interview') {
    const map: Record<string, 'info' | 'success' | 'danger' | 'warning'> = {
      待开始: 'info',
      通过: 'success',
      未通过: 'danger',
      待通知: 'warning'
    }
    return map[props.text] || 'info'
  }
  if (typeof props.text !== 'string') {
    return 'info'
  }
  const normalized = normalizeJobStatus(props.text)
  return statusTagTypeMap[normalized]
})

const displayText = computed(() => {
  if (props.mode !== 'delivery' || typeof props.text !== 'string') {
    return props.text
  }
  const normalized = normalizeJobStatus(props.text)
  return statusLabelMap[normalized]
})
</script>
