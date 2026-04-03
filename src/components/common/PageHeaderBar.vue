<template>
  <div class="page-card page-header-bar" :class="{ dense }">
    <div class="title-wrap">
      <h2 class="page-title">{{ title }}</h2>
      <div v-if="subtitle" class="sub-title">{{ subtitle }}</div>
      <slot name="extra" />
    </div>
    <div v-if="$slots.actions" class="actions-wrap">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  dense?: boolean
}>()
</script>

<style scoped lang="scss">
.page-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.title-wrap {
  min-width: 0;
}

.sub-title {
  margin-top: 6px;
  color: #94a3b8;
  font-size: 14px;
}

.actions-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-header-bar.dense {
  gap: 12px;
}

@media (max-width: 767px) {
  .page-header-bar {
    flex-direction: column;
    align-items: flex-start;
  }

  .actions-wrap {
    width: 100%;
  }
}
</style>
