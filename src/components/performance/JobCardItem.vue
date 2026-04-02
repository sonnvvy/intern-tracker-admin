<template>
  <article class="job-card">
    <img v-if="showImage" :src="item.image" alt="job-thumbnail" class="cover" loading="lazy" />

    <div class="content">
      <div class="main-row">
        <div class="title-wrap">
          <h3 class="company">{{ item.company }}</h3>
          <p class="job-title">{{ item.jobTitle }}</p>
        </div>
        <el-tag :type="statusTypeMap[item.status]" effect="light" class="status-tag">{{ item.status }}</el-tag>
      </div>

      <div class="meta-row">
        <span>{{ item.city }}</span>
        <span>{{ item.salary }}</span>
        <span>更新于 {{ item.updateTime }}</span>
      </div>

      <div class="tag-row">
        <el-tag v-for="tag in item.tags" :key="tag" size="small" effect="plain">{{ tag }}</el-tag>
      </div>

      <p class="remark">{{ item.remark }}</p>

      <div class="action-row">
        <el-button link type="primary" @click="emitAction('view')">查看</el-button>
        <el-button link type="warning" @click="emitAction('edit')">编辑</el-button>
        <el-button link type="danger" @click="emitAction('delete')">删除</el-button>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { JobActionType, JobListItem, JobStatus } from '@/types/performance'

interface Props {
  item: JobListItem
  showImage: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  action: [type: JobActionType, item: JobListItem]
}>()

const statusTypeMap: Record<JobStatus, 'info' | 'primary' | 'warning' | 'success' | 'danger'> = {
  待投递: 'info',
  已投递: 'primary',
  笔试中: 'warning',
  面试中: 'warning',
  '已 Offer': 'success',
  已结束: 'danger'
}

function emitAction(type: JobActionType) {
  emit('action', type, props.item)
}
</script>

<style scoped lang="scss">
.job-card {
  min-height: 176px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 12px;
  background: #fff;
  display: flex;
  gap: 12px;
}

.cover {
  width: 88px;
  height: 88px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid #e5e7eb;
}

.content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.main-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.title-wrap {
  min-width: 0;
}

.company {
  margin: 0;
  font-size: 16px;
  color: #111827;
  line-height: 1.2;
}

.job-title {
  margin: 4px 0 0;
  font-size: 13px;
  color: #6b7280;
}

.status-tag {
  flex-shrink: 0;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12px;
  color: #6b7280;
}

.tag-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.remark {
  margin: 0;
  font-size: 13px;
  color: #4b5563;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.action-row {
  margin-top: auto;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 768px) {
  .job-card {
    min-height: 196px;
  }

  .cover {
    width: 72px;
    height: 72px;
  }
}
</style>
