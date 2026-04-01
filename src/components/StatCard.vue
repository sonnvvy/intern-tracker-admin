<template>
  <div class="page-card stat-card">
    <div class="stat-top">
      <div>
        <div class="label">{{ label }}</div>
        <div class="value">{{ value }}</div>
      </div>
      <div class="icon-box" :class="iconClass">
        <el-icon><component :is="icon" /></el-icon>
      </div>
    </div>
    <div class="desc">{{ desc }}</div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  label: string
  value: number | string
  desc: string
  icon: Component
  iconClass: string
}>()
</script>

<style scoped lang="scss">
.stat-card {
  min-height: 148px;
}

.stat-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.label {
  color: #6b7280;
  font-size: 14px;
}

.value {
  margin-top: 16px;
  font-size: 42px;
  line-height: 1;
  font-weight: 800;
  color: #111827;
}

.desc {
  margin-top: 18px;
  color: #94a3b8;
  font-size: 13px;
}

.icon-box {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.icon-blue {
  background: #eff6ff;
  color: #2563eb;
}

.icon-orange {
  background: #fff7ed;
  color: #ea580c;
}

.icon-green {
  background: #f0fdf4;
  color: #16a34a;
}

.icon-purple {
  background: #f5f3ff;
  color: #7c3aed;
}
</style>
