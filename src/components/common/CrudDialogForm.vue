<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    :width="width"
    :destroy-on-close="destroyOnClose"
    @update:model-value="handleVisibleUpdate"
  >
    <slot />

    <template #footer>
      <slot name="footer">
        <el-button @click="handleCancel">{{ cancelText }}</el-button>
        <el-button type="primary" :loading="submitting" :disabled="submitting" @click="emit('confirm')">{{ confirmText }}</el-button>
      </slot>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    width?: string
    submitting?: boolean
    confirmText?: string
    cancelText?: string
    destroyOnClose?: boolean
  }>(),
  {
    width: '560px',
    submitting: false,
    confirmText: '确定',
    cancelText: '取消',
    destroyOnClose: false
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
  cancel: []
}>()

function handleCancel() {
  emit('update:modelValue', false)
  emit('cancel')
}

function handleVisibleUpdate(value: boolean) {
  emit('update:modelValue', value)
}
</script>
