<template>
  <div ref="containerRef" class="virtual-list" :style="{ height: `${height}px` }" @scroll="handleScroll">
    <div class="virtual-inner" :style="{ height: `${totalHeight}px` }">
      <div class="virtual-offset" :style="{ transform: `translateY(${offsetY}px)` }">
        <div v-for="(item, index) in visibleItems" :key="getItemKey(item, index)" class="virtual-row" :style="{ height: `${itemHeight}px` }">
          <slot :item="item" :index="startIndex + index" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { JobListItem } from '@/types/performance'

interface Props {
  items: JobListItem[]
  height: number
  itemHeight: number
  overscan?: number
}

const props = withDefaults(defineProps<Props>(), {
  overscan: 5
})

const emit = defineEmits<{
  renderedChange: [count: number]
}>()

const containerRef = ref<HTMLElement | null>(null)
const scrollTop = ref(0)

const totalHeight = computed(() => props.items.length * props.itemHeight)
const viewportCount = computed(() => Math.ceil(props.height / props.itemHeight))
const startIndex = computed(() => Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - props.overscan))
const endIndex = computed(() => Math.min(props.items.length, startIndex.value + viewportCount.value + props.overscan * 2))
const offsetY = computed(() => startIndex.value * props.itemHeight)
const visibleItems = computed(() => props.items.slice(startIndex.value, endIndex.value))

function handleScroll(event: Event) {
  const target = event.target as HTMLElement
  scrollTop.value = target.scrollTop
}

function getItemKey(item: JobListItem, index: number): number {
  return item.id ?? startIndex.value + index
}

watch(
  () => visibleItems.value.length,
  (count) => {
    emit('renderedChange', count)
  },
  { immediate: true }
)

watch(
  () => props.items.length,
  async () => {
    await nextTick()
    if (!containerRef.value) return
    const maxScrollTop = Math.max(0, totalHeight.value - props.height)
    if (containerRef.value.scrollTop > maxScrollTop) {
      containerRef.value.scrollTop = maxScrollTop
      scrollTop.value = maxScrollTop
    }
  }
)
</script>

<style scoped lang="scss">
.virtual-list {
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f9fafb;
}

.virtual-inner {
  position: relative;
  width: 100%;
}

.virtual-offset {
  width: 100%;
}

.virtual-row {
  padding: 6px;
}
</style>
