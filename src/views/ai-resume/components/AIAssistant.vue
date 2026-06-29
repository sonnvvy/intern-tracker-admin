<template>
  <div class="ai-assistant-panel page-card">
    <div class="section-head">
      <h3>LangChain AI 助手</h3>
      <span>面试问答 + 岗位匹配分析</span>
    </div>

    <el-tabs v-model="activeTab" class="assistant-tabs">
      <el-tab-pane label="AI 面试问答" name="chat">
        <div class="block">
          <el-input
            v-model="question"
            type="textarea"
            :rows="4"
            maxlength="1000"
            show-word-limit
            placeholder="例如：请帮我回答 Vue 响应式原理"
          />
          <div class="action-row">
            <el-button type="primary" :loading="chatLoading" @click="onAskQuestion">{{ chatLoading ? '生成中' : '生成回答建议' }}</el-button>
          </div>

          <div v-if="chatResult" class="result-box">
            <div class="result-title">建议回答</div>
            <div class="markdown-body" v-html="chatAnswerHtml"></div>

            <div class="result-title">关键要点</div>
            <ul class="list">
              <li v-for="item in chatResult.keyPoints" :key="item">{{ item }}</li>
            </ul>

            <div class="result-title">可追问方向</div>
            <ul class="list">
              <li v-for="item in chatResult.followUps" :key="item">{{ item }}</li>
            </ul>

            <el-tag effect="dark" type="success">信心等级：{{ chatResult.confidence }}</el-tag>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="岗位匹配分析" name="match">
        <div class="block">
          <el-input
            v-model="jd"
            type="textarea"
            :rows="6"
            maxlength="6000"
            show-word-limit
            placeholder="粘贴岗位 JD"
          />
          <el-input
            v-model="resumeText"
            type="textarea"
            :rows="8"
            maxlength="10000"
            show-word-limit
            placeholder="粘贴简历内容"
          />

          <div class="action-row">
            <el-button type="primary" :loading="jobLoading" @click="onAnalyzeJob">开始匹配分析</el-button>
          </div>

          <div v-if="jobResult" class="result-box">
            <div class="score-row">
              <span>匹配度</span>
              <el-progress :percentage="jobResult.matchScore" :stroke-width="12" status="success" />
            </div>

            <div class="result-title">缺失技能</div>
            <div class="tag-list">
              <el-tag v-for="item in jobResult.missingSkills" :key="item" effect="plain" type="warning">{{ item }}</el-tag>
              <span v-if="jobResult.missingSkills.length === 0" class="empty-tip">暂无明显缺口</span>
            </div>

            <div class="result-title">简历优化建议</div>
            <ul class="list">
              <li v-for="item in jobResult.resumeImprovements" :key="item">{{ item }}</li>
            </ul>

            <div class="result-title">面试准备建议</div>
            <ul class="list">
              <li v-for="item in jobResult.interviewPrep" :key="item">{{ item }}</li>
            </ul>

            <div class="result-title">综合结论</div>
            <p class="paragraph">{{ jobResult.summary }}</p>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { analyzeJobMatch, askInterviewQuestionStream } from '@/api/ai'
import { getErrorDisplayMessage } from '@/api/error'
import { renderMarkdownContent } from '@/utils/markdown'
import type { ChatAssistantResult, JobAdviceResult } from '@/types'

const activeTab = ref<'chat' | 'match'>('chat')
const question = ref('')
const jd = ref('')
const resumeText = ref('')

const chatLoading = ref(false)
const jobLoading = ref(false)
const chatResult = ref<ChatAssistantResult | null>(null)
const jobResult = ref<JobAdviceResult | null>(null)

const chatAnswerHtml = computed(() => renderMarkdownContent(chatResult.value))

async function onAskQuestion() {
  const q = question.value.trim()
  if (!q) {
    ElMessage.warning('请先输入问题')
    return
  }

  chatLoading.value = true
  chatResult.value = {
    answer: '',
    keyPoints: [],
    followUps: [],
    confidence: 'medium'
  }

  try {
    chatResult.value = await askInterviewQuestionStream(q, answer => {
      if (chatResult.value) {
        chatResult.value.answer = answer
      }
    })
  } catch (error) {
    chatResult.value = null
    const message = getErrorDisplayMessage(error, '生成失败，请稍后再试')
    ElMessage.error(message)
  } finally {
    chatLoading.value = false
  }
}

async function onAnalyzeJob() {
  const payload = {
    jd: jd.value.trim(),
    resumeText: resumeText.value.trim()
  }

  if (!payload.jd || !payload.resumeText) {
    ElMessage.warning('请先输入 JD 和简历内容')
    return
  }

  jobLoading.value = true
  try {
    jobResult.value = await analyzeJobMatch(payload)
  } catch (error) {
    const message = getErrorDisplayMessage(error, '分析失败，请稍后再试')
    ElMessage.error(message)
  } finally {
    jobLoading.value = false
  }
}
</script>

<style scoped lang="scss">
.ai-assistant-panel {
  display: grid;
  gap: 12px;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;

  h3 {
    margin: 0;
    font-size: 18px;
  }

  span {
    color: #64748b;
    font-size: 13px;
  }
}

.block {
  display: grid;
  gap: 12px;
}

.action-row {
  display: flex;
  justify-content: flex-end;
}

.result-box {
  padding: 12px;
  border-radius: 12px;
  background: #f8fafc;
  display: grid;
  gap: 10px;
}

.result-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.paragraph {
  margin: 0;
  color: #334155;
  line-height: 1.7;
}

.list {
  margin: 0;
  padding-left: 18px;
  color: #334155;
  line-height: 1.8;
}

.markdown-body {
  color: #334155;
  line-height: 1.7;
  overflow-wrap: anywhere;

  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4) {
    margin: 10px 0 6px;
    color: #0f172a;
    font-weight: 700;
    line-height: 1.35;
  }

  :deep(h1) {
    font-size: 20px;
  }

  :deep(h2) {
    font-size: 18px;
  }

  :deep(h3) {
    font-size: 16px;
  }

  :deep(h4) {
    font-size: 15px;
  }

  :deep(p) {
    margin: 0 0 8px;
  }

  :deep(p:last-child) {
    margin-bottom: 0;
  }

  :deep(ul),
  :deep(ol) {
    margin: 6px 0 8px;
    padding-left: 20px;
  }

  :deep(li) {
    margin: 3px 0;
  }

  :deep(strong) {
    color: #0f172a;
    font-weight: 700;
  }

  :deep(blockquote) {
    margin: 8px 0;
    padding: 6px 10px;
    border-left: 3px solid #cbd5e1;
    color: #475569;
    background: #f1f5f9;
  }

  :deep(code) {
    padding: 1px 4px;
    border-radius: 4px;
    background: #e2e8f0;
    color: #0f172a;
    font-family: Consolas, 'Courier New', monospace;
    font-size: 0.92em;
  }

  :deep(pre) {
    margin: 8px 0;
    padding: 10px;
    overflow-x: auto;
    border-radius: 6px;
    background: #0f172a;
    color: #e2e8f0;
  }

  :deep(pre code) {
    padding: 0;
    background: transparent;
    color: inherit;
  }
}
.score-row {
  display: grid;
  gap: 6px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.empty-tip {
  color: #94a3b8;
  font-size: 13px;
}
</style>
