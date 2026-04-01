<template>
  <div class="page-shell dashboard-page">
    <div class="welcome-card page-card">
      <div class="hero-text">
        <div class="eyebrow">个人求职管理系统</div>
        <h2>你好，{{ userStore.userInfo.name }}</h2>
        <p>统一记录岗位投递进度、面试安排和复盘内容，方便按优先级推进节奏，并把关键状态沉淀成可追踪的数据。</p>
      </div>
      <div class="hero-tags">
        <el-tag type="danger" size="large">本周优先处理 {{ deliveryStore.highPriorityCount }}</el-tag>
        <el-tag type="primary" size="large">待确认面试 {{ interviewStore.upcomingCount }}</el-tag>
      </div>
    </div>

    <div class="stats-grid">
      <StatCard
        v-for="item in statCards"
        :key="item.label"
        :label="item.label"
        :value="item.value"
        :desc="item.desc"
        :icon="item.icon"
        :icon-class="item.iconClass"
      />
    </div>

    <div class="chart-grid">
      <div class="page-card chart-card">
        <div class="card-head">
          <div>
            <div class="section-title">当前投递状态分布</div>
            <div class="section-desc">按岗位状态聚合统计，快速看清推进结构</div>
          </div>
        </div>
        <div v-if="chartLoading" class="chart-skeleton-wrap">
          <el-skeleton animated :rows="6" />
        </div>
        <div v-else ref="statusChartRef" class="chart-inner"></div>
      </div>
      <div class="page-card chart-card">
        <div class="card-head">
          <div>
            <div class="section-title">最近投递节奏</div>
            <div class="section-desc">按日期汇总投递数量，用来判断当前推进节奏</div>
          </div>
        </div>
        <div v-if="chartLoading" class="chart-skeleton-wrap">
          <el-skeleton animated :rows="6" />
        </div>
        <div v-else ref="trendChartRef" class="chart-inner"></div>
      </div>
    </div>

    <div class="bottom-grid">
      <div class="page-card todo-card">
        <div class="card-head">
          <div>
            <div class="section-title">最近待处理事项</div>
            <div class="section-desc">根据投递记录中的下一步动作自动生成</div>
          </div>
        </div>
        <el-skeleton v-if="listLoading" animated :rows="4" />
        <div v-else-if="deliveryStore.todoList.length === 0" class="empty-inline">暂无待处理事项</div>
        <div v-else v-for="item in deliveryStore.todoList" :key="item.id" class="todo-item">
          <div>
            <div class="todo-title">{{ item.title }}</div>
            <div class="todo-hint">{{ item.hint }}</div>
          </div>
          <el-tag :type="todoTagType[item.level]">{{ item.level }}</el-tag>
        </div>
      </div>

      <div class="page-card">
        <div class="card-head">
          <div>
            <div class="section-title">最近投递记录</div>
            <div class="section-desc">展示最近处理过的岗位，方便快速回看</div>
          </div>
        </div>
        <el-skeleton v-if="listLoading" animated :rows="4" />
        <div v-else-if="recentList.length === 0" class="empty-inline">暂无投递记录</div>
        <div v-else v-for="item in recentList" :key="item.id" class="timeline-item">
          <div>
            <div class="timeline-title">{{ item.companyName }} / {{ item.jobTitle }}</div>
            <div class="timeline-desc">{{ item.deliveryDate }} · {{ item.channel }} · {{ item.city }}</div>
          </div>
          <StatusTag :text="item.status" mode="delivery" />
        </div>
      </div>

      <div class="page-card">
        <div class="card-head">
          <div>
            <div class="section-title">高频知识点</div>
            <div class="section-desc">来自面试复盘页的 questionTags 统计</div>
          </div>
        </div>
        <div class="skill-tags">
          <el-tag v-for="item in interviewStore.tagFrequency" :key="item.name" effect="plain">
            {{ item.name }} · {{ item.value }}
          </el-tag>
        </div>
        <div class="tips-card">
          这一块的数据来自复盘记录，用来提示自己下一轮应重点复习 Vue3、状态管理和组件封装等高频知识点。
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Bell, Files, Promotion, Select } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useDeliveryStore } from '@/stores/delivery'
import { useInterviewStore } from '@/stores/interview'
import { throttle } from '@/utils/performance'

const StatCard = defineAsyncComponent(() => import('@/components/StatCard.vue'))
const StatusTag = defineAsyncComponent(() => import('@/components/StatusTag.vue'))

type EchartsModule = typeof import('echarts')

const userStore = useUserStore()
const deliveryStore = useDeliveryStore()
const interviewStore = useInterviewStore()
const statusChartRef = ref<HTMLElement | null>(null)
const trendChartRef = ref<HTMLElement | null>(null)
const chartLoading = ref(true)
const listLoading = ref(true)
let echartsModule: EchartsModule | null = null
let statusChart: import('echarts').ECharts | null = null
let trendChart: import('echarts').ECharts | null = null

const todoTagType: Record<'紧急' | '优先' | '常规', 'danger' | 'warning' | 'info'> = {
  紧急: 'danger',
  优先: 'warning',
  常规: 'info'
}

const statCards = computed(() => [
  { label: '累计投递', value: deliveryStore.dashboardStats.total, desc: '统一记录全部投递历史', icon: Files, iconClass: 'icon-blue' },
  { label: '推进中', value: deliveryStore.dashboardStats.interviewing, desc: '包含笔试和面试中的岗位', icon: Promotion, iconClass: 'icon-orange' },
  { label: '已拿到机会', value: deliveryStore.dashboardStats.offered, desc: '先稳住保底节奏，再对比其他机会', icon: Select, iconClass: 'icon-green' },
  { label: '待跟进面试', value: interviewStore.upcomingCount, desc: '根据复盘继续查漏补缺', icon: Bell, iconClass: 'icon-purple' }
])

const recentList = computed(() => deliveryStore.list.slice(0, 4))

async function ensureEcharts() {
  if (echartsModule) return echartsModule
  echartsModule = await import('echarts')
  return echartsModule
}

async function renderStatusChart() {
  if (!statusChartRef.value) return
  const echarts = await ensureEcharts()
  statusChart ??= echarts.init(statusChartRef.value)
  statusChart.setOption({
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '54%'],
        data: deliveryStore.statusChartData,
        label: { formatter: '{b}\n{c}' }
      }
    ]
  })
}

async function renderTrendChart() {
  if (!trendChartRef.value) return
  const echarts = await ensureEcharts()
  trendChart ??= echarts.init(trendChartRef.value)
  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 30, right: 18, top: 24, bottom: 28 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: deliveryStore.trendChartData.map((item) => item.date)
    },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        type: 'line',
        smooth: true,
        data: deliveryStore.trendChartData.map((item) => item.value),
        areaStyle: {}
      }
    ]
  })
}

const handleResize = throttle(() => {
  statusChart?.resize()
  trendChart?.resize()
}, 180)

watch(
  () => [deliveryStore.list.length, interviewStore.list.length],
  async () => {
    await nextTick()
    await renderStatusChart()
    await renderTrendChart()
  },
  { deep: true }
)

onMounted(async () => {
  await nextTick()
  await renderStatusChart()
  await renderTrendChart()
  chartLoading.value = false
  // 列表骨架只在首屏短暂显示，减少“白屏感”。
  window.setTimeout(() => {
    listLoading.value = false
  }, 320)
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  statusChart?.dispose()
  trendChart?.dispose()
})
</script>

<style scoped lang="scss">
.dashboard-page {
  display: grid;
  gap: 16px;
}

.welcome-card {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
  min-height: 152px;
}

.hero-text {
  max-width: 760px;

  .eyebrow {
    color: #64748b;
    font-size: 13px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h2 {
    margin: 10px 0 8px;
    font-size: 34px;
  }

  p {
    margin: 0;
    color: #64748b;
    line-height: 1.75;
    font-size: 15px;
  }
}

.hero-tags {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.stats-grid,
.chart-grid,
.bottom-grid {
  display: grid;
  gap: 16px;
}

.stats-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.chart-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.bottom-grid {
  grid-template-columns: 1.05fr 1fr 0.95fr;
}

.card-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.section-title {
  font-size: 20px;
  font-weight: 700;
}

.section-desc {
  margin-top: 6px;
  color: #94a3b8;
  font-size: 13px;
}

.chart-inner {
  width: 100%;
  height: 320px;
}

.chart-skeleton-wrap {
  padding: 10px 0;
}

.empty-inline {
  color: #64748b;
  font-size: 14px;
  line-height: 1.7;
}

.todo-item,
.timeline-item {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  padding: 14px 0;
  border-bottom: 1px solid #eef2f7;
}

.todo-item:last-child,
.timeline-item:last-child {
  border-bottom: none;
}

.todo-title,
.timeline-title {
  font-size: 15px;
  font-weight: 700;
}

.todo-hint,
.timeline-desc {
  margin-top: 6px;
  color: #64748b;
  line-height: 1.65;
  font-size: 13px;
}

.skill-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tips-card {
  margin-top: 14px;
  padding: 14px;
  border-radius: 12px;
  background: #f8fafc;
  color: #64748b;
  line-height: 1.75;
  font-size: 13px;
}

@media (max-width: 1280px) {
  .stats-grid,
  .chart-grid,
  .bottom-grid {
    grid-template-columns: 1fr;
  }

  .welcome-card {
    flex-direction: column;
  }
}
</style>
