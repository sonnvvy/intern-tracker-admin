<template>
  <div class="page-shell performance-page">
    <section class="page-card page-head">
      <h2 class="page-title">长列表性能测试</h2>
      <p class="desc">用于模拟不同数据量下普通列表与虚拟列表的渲染差异，辅助分析大数据列表性能问题。</p>
    </section>

    <PerformanceToolbar
      :selected-size="selectedSize"
      :render-mode="renderMode"
      :keyword="keyword"
      :show-image="showImage"
      :loading="loading"
      :size-options="JOB_LIST_SIZES"
      @update:selected-size="handleSizeChange"
      @update:render-mode="handleRenderModeChange"
      @update:keyword="handleKeywordChange"
      @update:show-image="handleShowImageChange"
      @refresh="handleRefresh"
    />

    <PerformanceStats :stats="statsData" />

    <section class="page-card list-card">
      <div class="list-head">
        <h3>{{ renderModeLabel }}</h3>
        <span>固定滚动区域高度：{{ LIST_HEIGHT }}px</span>
      </div>

      <div v-if="loading" class="loading-wrap">
        <el-skeleton :rows="6" animated />
      </div>

      <div v-else-if="filteredList.length === 0" class="loading-wrap">
        <el-empty description="暂无匹配数据" />
      </div>

      <div v-else>
        <VirtualList
          v-if="renderMode === 'virtual'"
          :items="filteredList"
          :height="LIST_HEIGHT"
          :item-height="ITEM_HEIGHT"
          :overscan="6"
          @rendered-change="handleRenderedChange"
        >
          <template #default="{ item }">
            <JobCardItem :item="item" :show-image="showImage" @action="handleAction" />
          </template>
        </VirtualList>

        <div v-else class="normal-list" :style="{ height: `${LIST_HEIGHT}px` }">
          <div v-for="item in filteredList" :key="item.id" class="normal-list-item">
            <JobCardItem :item="item" :show-image="showImage" @action="handleAction" />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import JobCardItem from '@/components/performance/JobCardItem.vue'
import PerformanceStats from '@/components/performance/PerformanceStats.vue'
import PerformanceToolbar from '@/components/performance/PerformanceToolbar.vue'
import VirtualList from '@/components/performance/VirtualList.vue'
import { generateMockJobList } from '@/mock/performance/mockJobList'
import { JOB_LIST_SIZES, type JobActionType, type JobListItem, type PerformanceStatsData, type RenderMode } from '@/types/performance'

const LIST_HEIGHT = 620
const ITEM_HEIGHT = 188

const selectedSize = ref<number>(1000)
const renderMode = ref<RenderMode>('normal')
const keyword = ref('')
const showImage = ref(true)
const loading = ref(false)
const sourceList = ref<JobListItem[]>([])
const firstRenderDuration = ref(0)
const renderedCount = ref(0)
const refreshTime = ref('-')
let keywordTimer: number | null = null

const filteredList = computed(() => {
  const search = keyword.value.trim().toLowerCase()
  if (!search) return sourceList.value
  return sourceList.value.filter((item) => {
    return item.company.toLowerCase().includes(search) || item.jobTitle.toLowerCase().includes(search)
  })
})

const renderModeLabel = computed(() => (renderMode.value === 'virtual' ? '虚拟列表渲染（仅渲染可视区）' : '普通列表渲染（全量渲染）'))

const statsData = computed<PerformanceStatsData>(() => ({
  dataSize: selectedSize.value,
  renderMode: renderMode.value,
  renderedCount: renderedCount.value,
  filteredCount: filteredList.value.length,
  firstRenderDuration: firstRenderDuration.value,
  isVirtualEnabled: renderMode.value === 'virtual',
  showImage: showImage.value,
  refreshTime: refreshTime.value
}))

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

async function measureRender(task: () => void | Promise<void>) {
  const start = performance.now()
  await task()
  await nextTick()
  await waitForPaint()
  firstRenderDuration.value = performance.now() - start
  refreshTime.value = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  if (renderMode.value === 'normal') {
    renderedCount.value = filteredList.value.length
  }
}

async function regenerateData() {
  loading.value = true
  await measureRender(async () => {
    sourceList.value = generateMockJobList(selectedSize.value)
  })
  loading.value = false
}

async function handleSizeChange(value: number) {
  if (value === selectedSize.value) return
  selectedSize.value = value
  await regenerateData()
}

async function handleRenderModeChange(value: RenderMode) {
  if (value === renderMode.value) return
  await measureRender(() => {
    renderMode.value = value
  })
}

function handleKeywordChange(value: string) {
  keyword.value = value
  if (keywordTimer) {
    window.clearTimeout(keywordTimer)
  }
  keywordTimer = window.setTimeout(async () => {
    await measureRender(async () => undefined)
  }, 220)
}

async function handleShowImageChange(value: boolean) {
  if (value === showImage.value) return
  await measureRender(() => {
    showImage.value = value
  })
}

async function handleRefresh() {
  await regenerateData()
}

function handleRenderedChange(count: number) {
  renderedCount.value = count
}

function handleAction(type: JobActionType, item: JobListItem) {
  const actionLabelMap: Record<JobActionType, string> = {
    view: '查看',
    edit: '编辑',
    delete: '删除'
  }
  ElMessage.success(`${actionLabelMap[type]}: ${item.company} / ${item.jobTitle}`)
}

onMounted(async () => {
  await regenerateData()
})
</script>

<style scoped lang="scss">
.performance-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.page-head {
  .desc {
    margin: 8px 0 0;
    color: #4b5563;
    font-size: 14px;
  }
}

.list-card {
  .list-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    h3 {
      margin: 0;
      font-size: 16px;
      color: #111827;
    }

    span {
      color: #6b7280;
      font-size: 13px;
    }
  }
}

.loading-wrap {
  min-height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.normal-list {
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f9fafb;
}

.normal-list-item {
  padding: 6px;
}

@media (max-width: 768px) {
  .list-card {
    .list-head {
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }
  }
}
</style>
