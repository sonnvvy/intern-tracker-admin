<template>
  <el-tag :type="tagType" :effect="effect"><slot>{{ text }}</slot></el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DeliveryStatus, InterviewResult, PriorityLevel } from '@/types'

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
  const map: Record<string, 'info' | 'warning' | 'primary' | 'success' | 'danger'> = {
    已投递: 'info',
    笔试中: 'warning',
    面试中: 'primary',
    已录用: 'success',
    已拒绝: 'danger'
  }
  return map[props.text] || 'info'
})
</script>
