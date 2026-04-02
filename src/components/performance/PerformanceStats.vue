<template>
  <section class="page-card stats-wrap">
    <div class="stats-grid">
      <div class="stat-item">
        <span class="stat-label">当前数据量</span>
        <strong class="stat-value">{{ stats.dataSize }}</strong>
      </div>
      <div class="stat-item">
        <span class="stat-label">渲染模式</span>
        <strong class="stat-value">{{ renderModeText }}</strong>
      </div>
      <div class="stat-item">
        <span class="stat-label">实际渲染条数</span>
        <strong class="stat-value">{{ stats.renderedCount }}</strong>
      </div>
      <div class="stat-item">
        <span class="stat-label">搜索结果条数</span>
        <strong class="stat-value">{{ stats.filteredCount }}</strong>
      </div>
      <div class="stat-item">
        <span class="stat-label">渲染耗时</span>
        <strong class="stat-value">{{ stats.firstRenderDuration.toFixed(2) }} ms</strong>
      </div>
      <div class="stat-item">
        <span class="stat-label">虚拟列表开关</span>
        <strong class="stat-value">{{ stats.isVirtualEnabled ? '启用' : '关闭' }}</strong>
      </div>
      <div class="stat-item">
        <span class="stat-label">图片字段</span>
        <strong class="stat-value">{{ stats.showImage ? '显示' : '隐藏' }}</strong>
      </div>
      <div class="stat-item">
        <span class="stat-label">最近刷新时间</span>
        <strong class="stat-value">{{ stats.refreshTime }}</strong>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PerformanceStatsData } from '@/types/performance'

interface Props {
  stats: PerformanceStatsData
}

const props = defineProps<Props>()

const renderModeText = computed(() => (props.stats.renderMode === 'virtual' ? '虚拟列表' : '普通列表'))
</script>

<style scoped lang="scss">
.stats-wrap {
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .stat-item {
    border-radius: 10px;
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    padding: 10px 12px;
    min-height: 72px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
  }

  .stat-label {
    font-size: 12px;
    color: #6b7280;
  }

  .stat-value {
    font-size: 16px;
    color: #111827;
    font-weight: 700;
  }
}

@media (max-width: 1100px) {
  .stats-wrap {
    .stats-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
}

@media (max-width: 640px) {
  .stats-wrap {
    .stats-grid {
      grid-template-columns: repeat(1, minmax(0, 1fr));
    }
  }
}
</style>
