<template>
  <section class="page-card toolbar-wrap">
    <div class="toolbar-row">
      <span class="label">数据量</span>
      <el-radio-group :model-value="selectedSize" size="small" @update:model-value="handleSizeChange">
        <el-radio-button v-for="size in sizeOptions" :key="size" :label="size">{{ size }} 条</el-radio-button>
      </el-radio-group>
    </div>

    <div class="toolbar-row">
      <span class="label">渲染模式</span>
      <el-radio-group :model-value="renderMode" size="small" @update:model-value="handleRenderModeChange">
        <el-radio-button label="normal">普通列表</el-radio-button>
        <el-radio-button label="virtual">虚拟列表</el-radio-button>
      </el-radio-group>
    </div>

    <div class="toolbar-row input-row">
      <el-input
        :model-value="keyword"
        placeholder="搜索公司名 / 岗位名"
        clearable
        class="search-input"
        @update:model-value="handleKeywordChange"
      />
      <el-switch :model-value="showImage" inline-prompt active-text="显示图片" inactive-text="隐藏图片" @update:model-value="handleImageSwitch" />
      <el-button type="primary" :loading="loading" @click="$emit('refresh')">刷新数据</el-button>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { RenderMode } from '@/types/performance'

interface Props {
  selectedSize: number
  renderMode: RenderMode
  keyword: string
  showImage: boolean
  loading: boolean
  sizeOptions: readonly number[]
}

defineProps<Props>()

const emit = defineEmits<{
  'update:selectedSize': [value: number]
  'update:renderMode': [value: RenderMode]
  'update:keyword': [value: string]
  'update:showImage': [value: boolean]
  refresh: []
}>()

function handleSizeChange(value: string | number | boolean) {
  if (typeof value === 'number') {
    emit('update:selectedSize', value)
  }
}

function handleRenderModeChange(value: string | number | boolean) {
  if (value === 'normal' || value === 'virtual') {
    emit('update:renderMode', value)
  }
}

function handleKeywordChange(value: string | number) {
  emit('update:keyword', String(value ?? ''))
}

function handleImageSwitch(value: string | number | boolean) {
  emit('update:showImage', Boolean(value))
}
</script>

<style scoped lang="scss">
.toolbar-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toolbar-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.label {
  width: 70px;
  color: #4b5563;
  font-size: 13px;
  flex-shrink: 0;
}

.input-row {
  .search-input {
    width: 280px;
  }
}

@media (max-width: 768px) {
  .label {
    width: auto;
  }

  .input-row {
    .search-input {
      width: 100%;
    }
  }
}
</style>
