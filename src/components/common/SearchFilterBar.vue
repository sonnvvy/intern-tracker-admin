<template>
  <div class="filter-bar" :class="wrapperClass">
    <template v-for="field in fields" :key="field.key">
      <el-input
        v-if="field.type === 'input'"
        :model-value="toInputValue(field.modelValue)"
        :class="field.className || 'filter-item'"
        :placeholder="field.placeholder"
        :clearable="field.clearable ?? true"
        :style="{ width: toWidth(field.width) }"
        @update:model-value="handleInputUpdate(field.key, $event)"
        @keyup.enter="emit('search')"
      />

      <el-select
        v-else-if="field.type === 'select'"
        :model-value="field.modelValue"
        :class="field.className || 'filter-item'"
        :placeholder="field.placeholder"
        :clearable="field.clearable ?? true"
        :style="{ width: toWidth(field.width) }"
        @update:model-value="handleSelectUpdate(field.key, $event)"
      >
        <el-option
          v-for="option in field.options || []"
          :key="String(option.value)"
          :label="option.label"
          :value="option.value"
        />
      </el-select>
    </template>

    <slot />

    <div v-if="showSearchButton || showResetButton || $slots.actions" class="filter-action-row" :class="actionsClass">
      <slot name="actions">
        <el-button v-if="showSearchButton" type="primary" plain @click="emit('search')">{{ searchText }}</el-button>
        <el-button v-if="showResetButton" @click="emit('reset')">{{ resetText }}</el-button>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface SearchFilterOption {
  label: string
  value: string | number | boolean
}

export interface SearchFilterField {
  key: string
  type: 'input' | 'select'
  modelValue: string | number | boolean | null | undefined
  placeholder?: string
  width?: number | string
  clearable?: boolean
  className?: string
  options?: SearchFilterOption[]
}

withDefaults(
  defineProps<{
    fields: SearchFilterField[]
    wrapperClass?: string
    actionsClass?: string
    showSearchButton?: boolean
    showResetButton?: boolean
    searchText?: string
    resetText?: string
  }>(),
  {
    wrapperClass: '',
    actionsClass: '',
    showSearchButton: true,
    showResetButton: true,
    searchText: '查询',
    resetText: '重置'
  }
)

const emit = defineEmits<{
  'field-change': [payload: { key: string; value: string | number | boolean | null | undefined }]
  search: []
  reset: []
}>()

function emitFieldChange(key: string, value: string | number | boolean | null | undefined) {
  emit('field-change', { key, value })
}

function handleInputUpdate(key: string, value: string | number) {
  emitFieldChange(key, String(value ?? ''))
}

function handleSelectUpdate(key: string, value: string | number | boolean | null | undefined) {
  emitFieldChange(key, value)
}

function toWidth(width?: number | string) {
  if (width === undefined) return '160px'
  return typeof width === 'number' ? `${width}px` : width
}

function toInputValue(value: string | number | boolean | null | undefined): string {
  return value == null ? '' : String(value)
}
</script>
