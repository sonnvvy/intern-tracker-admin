<template>
  <div class="page-shell delivery-page">
    <div class="page-card summary-card">
      <div>
        <h2 class="page-title">岗位投递</h2>
        <div class="sub-title">管理目标岗位、优先级和下一步动作，并通过跟进记录把状态流转串起来</div>
      </div>
      <div class="header-actions">
        <el-button plain @click="openExportDialog">导出 Excel</el-button>
        <el-button type="primary" @click="openCreateDialog">新增记录</el-button>
      </div>
    </div>

    <div class="content-grid layout-fixed">
      <div class="page-card main-card">
        <div class="filter-bar compact-filter">
        <el-input v-model="globalSearchInput" class="filter-item" placeholder="全局搜索：公司名 / 岗位名 / 城市" clearable style="width: 260px" />
        <el-select v-model="status" class="filter-item" placeholder="筛选状态" clearable style="width: 136px">
          <el-option v-for="item in statusOptions" :key="item" :label="item" :value="item" />
        </el-select>
        <el-select v-model="priority" class="filter-item" placeholder="筛选优先级" clearable style="width: 136px">
          <el-option v-for="item in priorityOptions" :key="item" :label="item" :value="item" />
        </el-select>
        <div class="filter-action-row">
          <el-button type="primary" plain @click="handleSearchNow">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </div>
      </div>

      <div v-if="filteredList.length === 0" class="empty-state">
        <el-empty description="暂无匹配数据" />
      </div>

      <template v-else>
        <div class="table-wrap">
          <el-table :data="pagedList" border table-layout="fixed" class="delivery-table">
            <el-table-column prop="companyName" label="目标公司" min-width="104" show-overflow-tooltip />
            <el-table-column prop="jobTitle" label="岗位名称" min-width="122" show-overflow-tooltip />
            <el-table-column v-if="!isMobileView" prop="channel" label="投递渠道" min-width="84" show-overflow-tooltip />
            <el-table-column prop="city" label="工作城市" width="76" />
            <el-table-column label="优先级" width="88">
              <template #default="scope">
                <StatusTag :text="scope.row.priority" mode="priority" />
              </template>
            </el-table-column>
            <el-table-column label="当前状态" width="88">
              <template #default="scope">
                <StatusTag :text="scope.row.status" mode="delivery" />
              </template>
            </el-table-column>
            <el-table-column prop="deliveryDate" label="投递日期" width="100" />
            <el-table-column v-if="!isMobileView" prop="nextStep" label="下一步动作" min-width="148" show-overflow-tooltip />
            <el-table-column label="操作" width="96" align="center">
              <template #default="scope">
                <div class="action-group">
                  <el-button link type="primary" @click="handlePreview(scope.row)">查看</el-button>
                  <el-button link type="primary" @click="handleEdit(scope.row)">编辑</el-button>
                  <el-button link type="danger" @click="handleDelete(scope.row.id)">删除</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="pagination-wrap">
          <el-pagination
            v-model:current-page="page"
            v-model:page-size="pageSize"
            background
            layout="total, prev, pager, next"
            :total="filteredList.length"
          />
        </div>
      </template>
      </div>

      <div class="page-card side-panel">
        <div class="section-title">跟进提醒</div>
        <div v-for="item in panelTodos" :key="item.id" class="todo-item">
          <div class="todo-title">{{ item.title }}</div>
          <div class="todo-hint">{{ item.hint }}</div>
        </div>
        <div class="section-title section-gap">优先级分布</div>
        <div v-for="item in prioritySummary" :key="item.label" class="rank-item">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }} 个</strong>
        </div>
      </div>
    </div>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑投递记录' : '新增投递记录'" :width="dialogWidth">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
        <el-form-item label="目标公司" prop="companyName">
          <el-input v-model="form.companyName" placeholder="例如：青禾数据" maxlength="20" show-word-limit />
        </el-form-item>
        <el-form-item label="岗位名称" prop="jobTitle">
          <el-input v-model="form.jobTitle" placeholder="例如：前端开发实习生" maxlength="30" show-word-limit />
        </el-form-item>
        <el-form-item label="投递渠道" prop="channel">
          <el-input v-model="form.channel" placeholder="官网投递 / 招聘平台 / 内推登记" />
        </el-form-item>
        <el-form-item label="工作城市" prop="city">
          <el-input v-model="form.city" placeholder="例如：苏州" />
        </el-form-item>
        <el-form-item label="优先级" prop="priority">
          <el-select v-model="form.priority" style="width: 100%">
            <el-option v-for="item in priorityOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="当前状态" prop="status">
          <el-select v-model="form.status" style="width: 100%">
            <el-option v-for="item in statusOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="下一步动作" prop="nextStep">
          <el-input v-model="form.nextStep" type="textarea" :rows="2" maxlength="60" show-word-limit placeholder="例如：准备一面项目讲解" />
        </el-form-item>
        <el-form-item label="备注信息">
          <el-input v-model="form.remark" type="textarea" :rows="3" maxlength="100" show-word-limit placeholder="记录这个岗位的补充信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="drawerVisible" title="投递详情" size="520px">
      <div v-if="currentRow" class="detail-shell">
        <div class="detail-card">
          <div class="detail-item"><span>目标公司</span><strong>{{ currentRow.companyName }}</strong></div>
          <div class="detail-item"><span>岗位名称</span><strong>{{ currentRow.jobTitle }}</strong></div>
          <div class="detail-item"><span>投递渠道</span><strong>{{ currentRow.channel }}</strong></div>
          <div class="detail-item"><span>工作城市</span><strong>{{ currentRow.city }}</strong></div>
          <div class="detail-item"><span>优先级</span><strong>{{ currentRow.priority }}</strong></div>
          <div class="detail-item"><span>当前状态</span><strong>{{ currentRow.status }}</strong></div>
          <div class="detail-item detail-block"><span>下一步动作</span><strong>{{ currentRow.nextStep }}</strong></div>
          <div class="detail-item detail-block"><span>备注信息</span><strong>{{ currentRow.remark || '暂无' }}</strong></div>
        </div>

        <div class="detail-card">
          <div class="timeline-head">
            <div>
              <div class="section-title small">跟进时间线</div>
              <div class="section-desc small">把投递状态和后续动作串起来，更像真实业务流程</div>
            </div>
            <el-button type="primary" plain @click="followDialogVisible = true">新增记录</el-button>
          </div>
          <div class="timeline-list">
            <div v-for="item in currentRow.followUps" :key="item.id" class="follow-item">
              <div class="follow-dot"></div>
              <div class="follow-body">
                <div class="follow-head">
                  <strong>{{ item.action }}</strong>
                  <span>{{ item.date }}</span>
                </div>
                <div class="follow-note">{{ item.note }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-drawer>

    <el-dialog v-model="followDialogVisible" title="新增跟进记录" :width="dialogWidth">
      <el-form ref="followFormRef" :model="followForm" :rules="followRules" label-width="92px">
        <el-form-item label="记录日期" prop="date">
          <el-input v-model="followForm.date" placeholder="例如：2026-03-10" />
        </el-form-item>
        <el-form-item label="动作名称" prop="action">
          <el-input v-model="followForm.action" placeholder="例如：收到一面通知" />
        </el-form-item>
        <el-form-item label="补充说明" prop="note">
          <el-input v-model="followForm.note" type="textarea" :rows="3" maxlength="80" show-word-limit placeholder="记录这次状态变化或下一步计划" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="followDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitFollowUp">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="exportDialogVisible" title="自定义导出列" :width="dialogWidth">
      <div class="export-desc">请勾选要导出的字段，然后选择导出范围。</div>
      <el-checkbox-group v-model="selectedExportColumns" class="export-columns">
        <el-checkbox v-for="item in exportColumnOptions" :key="item.key" :value="item.key">{{ item.label }}</el-checkbox>
      </el-checkbox-group>
      <template #footer>
        <el-button @click="exportDialogVisible = false">取消</el-button>
        <el-button :loading="exportLoading" @click="handleExportCurrentPage">导出当前页</el-button>
        <el-button type="primary" :loading="exportLoading" @click="handleExportAll">导出全部</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import * as XLSX from 'xlsx'
import { useDeliveryStore } from '@/stores/delivery'
import StatusTag from '@/components/StatusTag.vue'
import type { DeliveryItem, DeliveryStatus, PriorityLevel } from '@/types'

const deliveryStore = useDeliveryStore()
const globalSearchInput = ref('')
const globalSearchKeyword = ref('')
const status = ref<DeliveryStatus | ''>('')
const priority = ref<PriorityLevel | ''>('')
const dialogVisible = ref(false)
const drawerVisible = ref(false)
const followDialogVisible = ref(false)
const exportDialogVisible = ref(false)
const exportLoading = ref(false)
const isEdit = ref(false)
const page = ref(1)
const pageSize = ref(5)
const formRef = ref<FormInstance>()
const followFormRef = ref<FormInstance>()
const currentRow = ref<DeliveryItem | null>(null)
const editingId = ref<number | null>(null)
const isMobileView = ref(false)

type ExportColumnKey =
  | 'companyName'
  | 'jobTitle'
  | 'channel'
  | 'city'
  | 'priority'
  | 'status'
  | 'deliveryDate'
  | 'nextStep'
  | 'remark'

interface ExportColumnOption {
  key: ExportColumnKey
  label: string
}

const exportColumnOptions: ExportColumnOption[] = [
  { key: 'companyName', label: '目标公司' },
  { key: 'jobTitle', label: '岗位名称' },
  { key: 'channel', label: '投递渠道' },
  { key: 'city', label: '工作城市' },
  { key: 'priority', label: '优先级' },
  { key: 'status', label: '当前状态' },
  { key: 'deliveryDate', label: '投递日期' },
  { key: 'nextStep', label: '下一步动作' },
  { key: 'remark', label: '备注信息' }
]

const selectedExportColumns = ref<ExportColumnKey[]>([
  'companyName',
  'jobTitle',
  'status',
  'deliveryDate',
  'priority',
  'nextStep'
])

const dialogWidth = computed(() => (isMobileView.value ? 'calc(100vw - 32px)' : '560px'))

const statusOptions: DeliveryStatus[] = ['已投递', '笔试中', '面试中', '已录用', '已拒绝']
const priorityOptions: PriorityLevel[] = ['高优先级', '正常跟进', '保底机会']

const createEmptyForm = () => ({
  companyName: '',
  jobTitle: '',
  channel: '',
  status: '已投递' as DeliveryStatus,
  city: '',
  priority: '正常跟进' as PriorityLevel,
  nextStep: '',
  remark: ''
})

const form = reactive(createEmptyForm())
const followForm = reactive({
  date: new Date().toISOString().slice(0, 10),
  action: '',
  note: ''
})

const rules: FormRules<typeof form> = {
  companyName: [{ required: true, message: '请输入目标公司', trigger: 'blur' }],
  jobTitle: [{ required: true, message: '请输入岗位名称', trigger: 'blur' }],
  channel: [{ required: true, message: '请输入投递渠道', trigger: 'blur' }],
  city: [{ required: true, message: '请输入工作城市', trigger: 'blur' }],
  nextStep: [
    { required: true, message: '请填写下一步动作', trigger: 'blur' },
    { min: 4, max: 60, message: '长度保持在 4 到 60 个字符', trigger: 'blur' }
  ]
}

const followRules: FormRules<typeof followForm> = {
  date: [{ required: true, message: '请输入记录日期', trigger: 'blur' }],
  action: [{ required: true, message: '请输入动作名称', trigger: 'blur' }],
  note: [{ required: true, message: '请填写补充说明', trigger: 'blur' }]
}

function debounce<T extends (...args: never[]) => void>(fn: T, delay = 300) {
  let timer: number | null = null
  return (...args: Parameters<T>) => {
    if (timer !== null) {
      window.clearTimeout(timer)
    }
    timer = window.setTimeout(() => {
      fn(...args)
    }, delay)
  }
}

const applyGlobalSearch = debounce((value: string) => {
  globalSearchKeyword.value = value.trim().toLowerCase()
  page.value = 1
}, 300)

watch(globalSearchInput, (value) => {
  applyGlobalSearch(value)
})

function syncMobileView() {
  isMobileView.value = window.innerWidth < 768
}

const filteredList = computed(() => {
  return deliveryStore.list.filter((item) => {
    const normalizedKeyword = globalSearchKeyword.value
    const matchKeyword =
      !normalizedKeyword ||
      item.companyName.toLowerCase().includes(normalizedKeyword) ||
      item.jobTitle.toLowerCase().includes(normalizedKeyword) ||
      item.city.toLowerCase().includes(normalizedKeyword)
    const matchStatus = !status.value || item.status === status.value
    const matchPriority = !priority.value || item.priority === priority.value
    return matchKeyword && matchStatus && matchPriority
  })
})

const pagedList = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredList.value.slice(start, start + pageSize.value)
})

const panelTodos = computed(() => deliveryStore.todoList.slice(0, 4))

const prioritySummary = computed(() => [
  { label: '高优先级', value: deliveryStore.list.filter((item) => item.priority === '高优先级').length },
  { label: '正常跟进', value: deliveryStore.list.filter((item) => item.priority === '正常跟进').length },
  { label: '保底机会', value: deliveryStore.list.filter((item) => item.priority === '保底机会').length }
])

watch([status, priority], () => {
  page.value = 1
})

function resetFilter() {
  globalSearchInput.value = ''
  globalSearchKeyword.value = ''
  status.value = ''
  priority.value = ''
}

function handleSearchNow() {
  globalSearchKeyword.value = globalSearchInput.value.trim().toLowerCase()
  page.value = 1
}

function resetForm() {
  Object.assign(form, createEmptyForm())
  editingId.value = null
  formRef.value?.clearValidate()
}

function resetFollowForm() {
  followForm.date = new Date().toISOString().slice(0, 10)
  followForm.action = ''
  followForm.note = ''
  followFormRef.value?.clearValidate()
}

function openCreateDialog() {
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

function openExportDialog() {
  exportDialogVisible.value = true
}

function handlePreview(row: DeliveryItem) {
  currentRow.value = row
  drawerVisible.value = true
}

function handleEdit(row: DeliveryItem) {
  isEdit.value = true
  editingId.value = row.id
  Object.assign(form, {
    companyName: row.companyName,
    jobTitle: row.jobTitle,
    channel: row.channel,
    status: row.status,
    city: row.city,
    priority: row.priority,
    nextStep: row.nextStep,
    remark: row.remark || ''
  })
  dialogVisible.value = true
}

async function submitForm() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  if (isEdit.value && editingId.value) {
    const target = deliveryStore.list.find((item) => item.id === editingId.value)
    if (!target) return
    deliveryStore.updateDelivery({ ...target, ...form })
    if (currentRow.value?.id === editingId.value) currentRow.value = { ...target, ...form }
    ElMessage.success('修改成功')
  } else {
    deliveryStore.addDelivery({ ...form })
    ElMessage.success('新增成功')
  }

  dialogVisible.value = false
  resetForm()
}

async function submitFollowUp() {
  const valid = await followFormRef.value?.validate().catch(() => false)
  if (!valid || !currentRow.value) return
  deliveryStore.addFollowUp(currentRow.value.id, { ...followForm })
  currentRow.value = deliveryStore.list.find((item) => item.id === currentRow.value?.id) || null
  ElMessage.success('新增跟进记录成功')
  followDialogVisible.value = false
  resetFollowForm()
}

async function handleDelete(id: number) {
  await ElMessageBox.confirm('确认删除这条投递记录吗？', '提示', { type: 'warning' })
  deliveryStore.removeDelivery(id)
  ElMessage.success('删除成功')
}

function formatExportData(source: DeliveryItem[]): Array<Record<string, string>> {
  const columns = exportColumnOptions.filter((item) => selectedExportColumns.value.includes(item.key))

  return source.map((item) => {
    const row: Record<string, string> = {}
    columns.forEach((column) => {
      if (column.key === 'remark') {
        row[column.label] = item.remark || ''
      } else if (column.key === 'deliveryDate') {
        row[column.label] = item.deliveryDate
      } else {
        row[column.label] = String(item[column.key])
      }
    })
    return row
  })
}

function exportToExcel(rows: DeliveryItem[]) {
  if (selectedExportColumns.value.length === 0) {
    ElMessage.warning('请至少选择一个导出字段')
    return
  }

  if (rows.length === 0) {
    ElMessage.warning('当前没有可导出的数据')
    return
  }

  const data = formatExportData(rows)
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '岗位投递')

  const date = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(workbook, `job-list-${date}.xlsx`)
}

function withExportLoading(task: () => void) {
  exportLoading.value = true
  try {
    task()
  } finally {
    exportLoading.value = false
  }
}

function handleExportCurrentPage() {
  withExportLoading(() => {
    exportToExcel(pagedList.value)
    if (pagedList.value.length > 0) {
      ElMessage.success('已导出当前页数据')
      exportDialogVisible.value = false
    }
  })
}

function handleExportAll() {
  withExportLoading(() => {
    exportToExcel(filteredList.value)
    if (filteredList.value.length > 0) {
      ElMessage.success('已导出全部筛选数据')
      exportDialogVisible.value = false
    }
  })
}

onMounted(() => {
  syncMobileView()
  window.addEventListener('resize', syncMobileView)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncMobileView)
})
</script>

<style scoped lang="scss">
.delivery-page {
  display: grid;
  gap: 16px;
  min-width: 0;
  max-width: 100%;
  overflow-x: hidden;
}

.layout-fixed {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 16px;
  align-items: start;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}

.summary-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sub-title {
  margin-top: 6px;
  color: #94a3b8;
  font-size: 14px;
}

.main-card,
.side-panel {
  width: 100%;
  min-width: 0;
}

.main-card {
  overflow: hidden;
  max-width: 100%;
}

.compact-filter {
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-action-row {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-wrap {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
  scrollbar-gutter: stable;
}

.delivery-table {
  width: 100%;
  min-width: 900px;
}

.empty-state {
  padding: 24px 0 8px;
}

.action-group {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
}

:deep(.action-group .el-button) {
  margin-left: 0;
  margin-right: 0;
  padding: 0;
  min-height: 24px;
  justify-content: center;
  text-align: center;
}


.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.toolbar-right {
  margin-left: auto;
}

.side-panel {
  display: grid;
  gap: 0;
}

.side-panel .section-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 12px;
}

.section-gap {
  margin-top: 20px;
}

.todo-item {
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}

.todo-title {
  font-weight: 600;
  color: #0f172a;
}

.todo-hint {
  margin-top: 6px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

.rank-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}

:deep(.el-table) {
  width: 100% !important;
}

:deep(.delivery-table .el-table__cell) {
  padding: 10px 0;
}

.detail-shell {
  display: grid;
  gap: 16px;
}

.detail-card {
  padding: 18px;
  border-radius: 16px;
  background: #fff;
  border: 1px solid #eef2f7;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid #f1f5f9;

  span {
    color: #6b7280;
  }

  strong {
    text-align: right;
    line-height: 1.6;
  }
}

.detail-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.detail-block {
  align-items: flex-start;
}

.timeline-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.small {
  font-size: 15px;
}

.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.follow-item {
  display: flex;
  gap: 12px;
}

.follow-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #409eff;
  margin-top: 7px;
  flex-shrink: 0;
}

.follow-body {
  flex: 1;
  padding-bottom: 14px;
  border-bottom: 1px solid #eef2f7;
}

.follow-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  span {
    color: #94a3b8;
    font-size: 12px;
  }
}

.follow-note {
  margin-top: 6px;
  color: #64748b;
  line-height: 1.7;
  font-size: 13px;
}

.export-desc {
  color: #64748b;
  margin-bottom: 12px;
}

.export-columns {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px 8px;
}

@media (max-width: 1280px) {
  .layout-fixed {
    grid-template-columns: minmax(0, 1fr) 280px;
  }

  .delivery-table {
    min-width: 860px;
  }
}

@media (max-width: 1200px) {
  .layout-fixed {
    grid-template-columns: 1fr;
  }

  .toolbar-right {
    margin-left: 0;
  }
}

@media (max-width: 767px) {
  .summary-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .compact-filter {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .filter-item {
    width: 100%;
  }

  :deep(.filter-item .el-input__wrapper),
  :deep(.filter-item .el-select__wrapper) {
    width: 100%;
  }

  .filter-action-row {
    margin-left: 0;
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  :deep(.filter-action-row .el-button) {
    height: 40px;
  }

  .table-wrap {
    overflow-x: auto;
  }

  .delivery-table {
    min-width: 700px;
  }

  :deep(.el-dialog) {
    margin-top: 6vh !important;
  }

  :deep(.el-dialog__body) {
    max-height: 66vh;
    overflow-y: auto;
  }

  .export-columns {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
