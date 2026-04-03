<template>
  <div class="page-shell interview-page">
    <PageHeaderBar
      class="summary-card"
      title="面试复盘"
      subtitle="把每次面试提到的知识点和答题情况记下来，后面查漏补缺会更快"
    >
      <template #actions>
        <el-button type="primary" plain @click="dialogVisible = true">新增复盘</el-button>
      </template>
    </PageHeaderBar>

    <div class="page-card filter-card">
      <SearchFilterBar
        wrapper-class="no-margin"
        :fields="interviewFilterFields"
        :show-search-button="false"
        :show-reset-button="false"
        @field-change="handleFilterFieldChange"
      >
        <template #actions>
          <StatusTag text="待跟进" mode="interview">待跟进 {{ interviewStore.upcomingCount }}</StatusTag>
        </template>
      </SearchFilterBar>
    </div>

    <div class="content-grid">
      <div class="page-card">
        <el-table :data="filteredList" border>
          <el-table-column prop="companyName" label="目标公司" min-width="130" />
          <el-table-column prop="jobTitle" label="岗位名称" min-width="150" />
          <el-table-column prop="round" label="轮次" width="90" />
          <el-table-column prop="interviewDate" label="面试时间" min-width="150" />
          <el-table-column prop="interviewer" label="面试官角色" min-width="120" />
          <el-table-column label="结果" width="110">
            <template #default="scope">
              <StatusTag :text="scope.row.result" mode="interview" />
            </template>
          </el-table-column>
          <el-table-column label="高频知识点" min-width="180">
            <template #default="scope">
              <div class="inline-tags">
                <el-tag v-for="item in scope.row.questionTags" :key="item" effect="plain">{{ item }}</el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="summary" label="复盘内容" min-width="240" show-overflow-tooltip />
        </el-table>
      </div>

      <div class="page-card side-panel">
        <div class="section-title">复习提醒</div>
        <div v-for="item in interviewStore.tagFrequency" :key="item.name" class="rank-item">
          <span>{{ item.name }}</span>
          <strong>{{ item.value }} 次</strong>
        </div>
        <div class="panel-tip">这部分是根据复盘里记录的知识点标签自动统计出来的，方便下一次集中复习。</div>
      </div>
    </div>

    <CrudDialogForm v-model="dialogVisible" title="新增面试复盘" width="560px" @confirm="submitForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
        <el-form-item label="目标公司" prop="companyName"><el-input v-model="form.companyName" /></el-form-item>
        <el-form-item label="岗位名称" prop="jobTitle"><el-input v-model="form.jobTitle" /></el-form-item>
        <el-form-item label="轮次" prop="round"><el-input v-model="form.round" placeholder="例如：一面 / 二面 / HR 面" /></el-form-item>
        <el-form-item label="面试时间" prop="interviewDate"><el-input v-model="form.interviewDate" placeholder="例如：2026-03-10 19:30" /></el-form-item>
        <el-form-item label="面试结果" prop="result">
          <el-select v-model="form.result" style="width: 100%">
            <el-option v-for="item in resultOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="知识点标签" prop="questionTags">
          <el-select v-model="form.questionTags" multiple allow-create filterable default-first-option style="width: 100%" placeholder="输入后回车，例如 Vue3、TypeScript">
            <el-option v-for="item in allTagOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="复盘内容" prop="summary">
          <el-input v-model="form.summary" type="textarea" :rows="4" placeholder="记录本次面试过程、问题和后续要补的内容" />
        </el-form-item>
      </el-form>
    </CrudDialogForm>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import CrudDialogForm from '@/components/common/CrudDialogForm.vue'
import PageHeaderBar from '@/components/common/PageHeaderBar.vue'
import SearchFilterBar from '@/components/common/SearchFilterBar.vue'
import { useInterviewStore } from '@/stores/interview'
import StatusTag from '@/components/StatusTag.vue'
import type { InterviewItem, InterviewResult } from '@/types'

const interviewStore = useInterviewStore()
const keyword = ref('')
const result = ref<InterviewResult | ''>('')
const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const resultOptions: InterviewResult[] = ['待开始', '通过', '未通过', '待通知']

const interviewFilterFields = computed(() => [
  {
    key: 'keyword',
    type: 'input' as const,
    modelValue: keyword.value,
    placeholder: '搜索公司、岗位或知识点',
    width: 240
  },
  {
    key: 'result',
    type: 'select' as const,
    modelValue: result.value,
    placeholder: '筛选结果',
    width: 150,
    options: resultOptions.map((item) => ({ label: item, value: item }))
  }
])

const form = reactive<Omit<InterviewItem, 'id'>>({
  companyName: '',
  jobTitle: '',
  round: '',
  interviewDate: '',
  interviewer: '待补充',
  result: '待开始',
  summary: '',
  questionTags: []
})

const rules: FormRules<typeof form> = {
  companyName: [{ required: true, message: '请输入目标公司', trigger: 'blur' }],
  jobTitle: [{ required: true, message: '请输入岗位名称', trigger: 'blur' }],
  round: [{ required: true, message: '请输入轮次', trigger: 'blur' }],
  interviewDate: [{ required: true, message: '请输入面试时间', trigger: 'blur' }],
  questionTags: [{ required: true, message: '请至少填写一个知识点标签', trigger: 'change' }],
  summary: [{ required: true, message: '请填写复盘内容', trigger: 'blur' }]
}

const filteredList = computed(() => {
  return interviewStore.list.filter((item) => {
    const matchKeyword =
      !keyword.value ||
      item.companyName.includes(keyword.value) ||
      item.jobTitle.includes(keyword.value) ||
      item.questionTags.some((tag) => tag.includes(keyword.value))
    const matchResult = !result.value || item.result === result.value
    return matchKeyword && matchResult
  })
})

const allTagOptions = computed(() => [...new Set(interviewStore.list.flatMap((item) => item.questionTags))])

function handleFilterFieldChange(payload: { key: string; value: string | number | boolean | null | undefined }) {
  if (payload.key === 'keyword') {
    keyword.value = String(payload.value ?? '')
    return
  }

  if (payload.key === 'result') {
    result.value = (payload.value as InterviewResult | '') || ''
  }
}

async function submitForm() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  interviewStore.addInterview({ ...form, questionTags: [...form.questionTags] })
  ElMessage.success('新增复盘成功')
  dialogVisible.value = false
  form.companyName = ''
  form.jobTitle = ''
  form.round = ''
  form.interviewDate = ''
  form.interviewer = '待补充'
  form.result = '待开始'
  form.summary = ''
  form.questionTags = []
}
</script>

<style scoped lang="scss">
.interview-page,
.content-grid {
  display: grid;
  gap: 16px;
}

.content-grid {
  grid-template-columns: minmax(0, 1fr) 300px;
}

.summary-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sub-title {
  margin-top: 6px;
  color: #909399;
  font-size: 14px;
}

.no-margin {
  margin-bottom: 0;
}

.inline-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.side-panel .section-title {
  margin-bottom: 12px;
  font-size: 18px;
  font-weight: 700;
}

.rank-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}

.panel-tip {
  margin-top: 16px;
  color: #6b7280;
  line-height: 1.6;
}
</style>
