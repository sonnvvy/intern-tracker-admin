<template>
  <div class="page-shell ai-resume-page">
    <div class="page-card header-card">
      <h2 class="page-title">AI 简历解析</h2>
      <div class="sub-title">上传简历，自动提取技能、项目经历和优化建议</div>
    </div>

    <div class="page-card upload-card">
      <el-upload
        ref="uploadRef"
        class="resume-upload"
        drag
        :auto-upload="false"
        :limit="1"
        accept=".pdf,.doc,.docx"
        :show-file-list="false"
        :on-change="handleFileChange"
        :on-exceed="handleExceed"
      >
        <el-icon class="upload-icon"><UploadFilled /></el-icon>
        <div class="el-upload__text">点击或拖拽上传简历文件</div>
        <template #tip>
          <div class="el-upload__tip">支持 PDF、DOC、DOCX 格式，单个文件不超过 10MB</div>
        </template>
      </el-upload>

      <div v-if="selectedFile" class="file-line">
        <span class="file-name">{{ selectedFile.name }}</span>
        <el-button type="danger" link @click="removeFile">删除</el-button>
      </div>

      <div class="action-line">
        <el-button type="primary" :loading="isLoading" :disabled="!selectedFile || isLoading" @click="startAnalyze">
          {{ isLoading ? currentStatusTitle : '开始解析' }}
        </el-button>
      </div>
    </div>

    <div v-if="isLoading" class="page-card progress-card">
      <el-steps :active="activeStep" finish-status="success" align-center>
        <el-step
          v-for="(item, index) in progressSteps"
          :key="item.title"
          :title="item.title"
          :description="item.description"
          :status="getStepStatus(index)"
        />
      </el-steps>
      <div class="loading-tip">
        <div class="loading-title">{{ currentStatusTitle }}</div>
        <div class="loading-desc">{{ currentStatusDescription }}</div>
      </div>
    </div>

    <el-alert
      v-if="errorText"
      type="error"
      :closable="false"
      :title="errorText"
      show-icon
      class="state-alert"
    />

    <div v-if="isSuccess" class="page-card success-card">
      <el-result icon="success" title="解析完成" sub-title="解析完成，已生成结构化结果" />
    </div>

    <div v-if="isError" class="action-line">
      <el-button type="primary" :disabled="!selectedFile" @click="startAnalyze">重新解析</el-button>
    </div>

    <div v-if="result" class="result-grid">
      <div class="page-card">
        <div class="section-title">基本信息</div>
        <div class="info-line"><span>姓名：</span>{{ result.name || '-' }}</div>
        <div class="info-line"><span>学历：</span>{{ result.education || '-' }}</div>
        <div class="info-line"><span>专业：</span>{{ result.major || '-' }}</div>
      </div>

      <div class="page-card">
        <div class="section-title">技能标签</div>
        <div class="tag-wrap">
          <el-tag v-for="item in result.skills" :key="item" effect="plain">{{ item }}</el-tag>
          <span v-if="result.skills.length === 0" class="empty-inline">暂无</span>
        </div>
      </div>

      <div class="page-card">
        <div class="section-title">项目经历</div>
        <ul class="line-list">
          <li v-for="item in result.projects" :key="item">{{ item }}</li>
          <li v-if="result.projects.length === 0" class="empty-inline">暂无</li>
        </ul>
      </div>

      <div class="page-card">
        <div class="section-title">实习经历</div>
        <ul class="line-list">
          <li v-for="item in result.internships" :key="item">{{ item }}</li>
          <li v-if="result.internships.length === 0" class="empty-inline">暂无</li>
        </ul>
      </div>

      <div class="page-card">
        <div class="section-title">求职方向建议</div>
        <ul class="line-list">
          <li v-for="item in result.jobDirections" :key="item">{{ item }}</li>
          <li v-if="result.jobDirections.length === 0" class="empty-inline">暂无</li>
        </ul>
      </div>

      <div class="page-card">
        <div class="section-title">简历优化建议</div>
        <ul class="line-list">
          <li v-for="item in result.advice" :key="item">{{ item }}</li>
          <li v-if="result.advice.length === 0" class="empty-inline">暂无</li>
        </ul>
      </div>
    </div>

    <div v-else-if="!isLoading && !errorText" class="page-card empty-state-card">
      <el-empty description="上传简历后即可开始解析" />
    </div>

    <AIAssistant />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { UploadFilled } from '@element-plus/icons-vue'
import type { UploadFile, UploadFiles, UploadInstance } from 'element-plus'
import { ElMessage } from 'element-plus'
import { analyzeResume } from '@/api/ai'
import type { ResumeAnalysisResult } from '@/types'
import AIAssistant from './components/AIAssistant.vue'

interface ProgressStep {
  title: string
  description: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx']

const uploadRef = ref<UploadInstance>()
const selectedFile = ref<File | null>(null)
const isLoading = ref(false)
const isSuccess = ref(false)
const isError = ref(false)
const result = ref<ResumeAnalysisResult | null>(null)
const errorText = ref('')
const activeStep = ref(0)
const timerId = ref<number | null>(null)

const progressSteps: ProgressStep[] = [
  { title: '上传中...', description: '正在上传简历文件' },
  { title: '提取文本中...', description: '正在提取简历文本，扫描版将自动尝试 OCR' },
  { title: 'AI 分析中...', description: '正在调用大模型结构化提取字段' },
  { title: '生成结果中...', description: '即将完成，请稍候' }
]

const currentStatusTitle = computed(() => progressSteps[Math.min(activeStep.value, progressSteps.length - 1)].title)
const currentStatusDescription = computed(
  () => progressSteps[Math.min(activeStep.value, progressSteps.length - 1)].description
)
const defaultErrorText = '解析失败：请检查文件清晰度或网络状态后重试。扫描版 PDF 建议上传更清晰版本。'

function getExtension(name: string): string {
  const parts = name.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}

function clearState() {
  isSuccess.value = false
  isError.value = false
  errorText.value = ''
  result.value = null
}

function clearTimer() {
  if (timerId.value !== null) {
    window.clearInterval(timerId.value)
    timerId.value = null
  }
}

function startProgress() {
  clearTimer()
  activeStep.value = 0
  timerId.value = window.setInterval(() => {
    if (activeStep.value < progressSteps.length - 1) {
      activeStep.value += 1
    }
  }, 1500)
}

function handleExceed() {
  ElMessage.error('仅支持上传 1 个文件')
}

function handleFileChange(uploadFile: UploadFile, uploadFiles: UploadFiles) {
  const rawFile = uploadFile.raw
  if (!rawFile) {
    return
  }

  const extension = getExtension(rawFile.name)
  const isAllowedType = ALLOWED_EXTENSIONS.includes(extension)
  const isAllowedSize = rawFile.size <= MAX_FILE_SIZE

  if (!isAllowedType) {
    ElMessage.error('仅支持 PDF、DOC、DOCX 格式文件')
    uploadRef.value?.clearFiles()
    selectedFile.value = null
    return
  }

  if (!isAllowedSize) {
    ElMessage.error('文件大小不能超过 10MB')
    uploadRef.value?.clearFiles()
    selectedFile.value = null
    return
  }

  const latestFile = uploadFiles[uploadFiles.length - 1]?.raw
  selectedFile.value = latestFile ?? rawFile
  clearState()
}

function removeFile() {
  uploadRef.value?.clearFiles()
  selectedFile.value = null
  clearState()
  clearTimer()
  isLoading.value = false
  activeStep.value = 0
}

function getStepStatus(index: number): 'wait' | 'process' | 'success' {
  if (index < activeStep.value) {
    return 'success'
  }
  if (index === activeStep.value) {
    return 'process'
  }
  return 'wait'
}

async function startAnalyze() {
  if (!selectedFile.value || isLoading.value) {
    return
  }

  clearState()
  isLoading.value = true
  startProgress()

  try {
    const parsed = await analyzeResume(selectedFile.value)
    result.value = parsed
    isSuccess.value = true
    activeStep.value = progressSteps.length - 1
  } catch (error) {
    isError.value = true
    errorText.value = error instanceof Error && error.message ? `解析失败：${error.message}` : defaultErrorText
  } finally {
    clearTimer()
    isLoading.value = false
  }
}

onBeforeUnmount(() => {
  clearTimer()
})
</script>

<style scoped lang="scss">
.ai-resume-page {
  display: grid;
  gap: 16px;
}

.sub-title {
  margin-top: 8px;
  color: #64748b;
  font-size: 14px;
}

.upload-card {
  display: grid;
  gap: 14px;
}

.resume-upload {
  width: 100%;
}

:deep(.resume-upload .el-upload) {
  width: 100%;
}

:deep(.resume-upload .el-upload-dragger) {
  width: 100%;
  padding: 28px 12px;
}

.upload-icon {
  font-size: 28px;
  color: #409eff;
}

.file-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #f8fafc;
}

.file-name {
  font-size: 14px;
  color: #0f172a;
  word-break: break-all;
}

.action-line {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

:deep(.resume-upload .el-upload__tip) {
  text-align: center;
}

.progress-card {
  display: grid;
  gap: 14px;
}

.loading-tip {
  padding: 12px;
  border-radius: 10px;
  background: #f8fafc;
}

.loading-title {
  font-weight: 600;
  margin-bottom: 6px;
}

.loading-desc {
  color: #64748b;
  font-size: 14px;
}

.state-alert {
  margin-top: -6px;
}

.result-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 12px;
}

.info-line {
  margin-bottom: 8px;
  color: #334155;

  span {
    color: #64748b;
  }
}

.tag-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.line-list {
  margin: 0;
  padding-left: 18px;
  color: #334155;
  line-height: 1.8;
}

.empty-inline {
  color: #94a3b8;
}

@media (max-width: 980px) {
  .result-grid {
    grid-template-columns: 1fr;
  }
}
</style>
