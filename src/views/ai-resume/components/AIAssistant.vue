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
            <el-button type="primary" :loading="chatLoading" @click="onAskQuestion">生成回答建议</el-button>
          </div>

          <div v-if="chatResult" class="result-box">
            <div class="result-title">建议回答</div>
            <p class="paragraph">{{ chatResult.answer }}</p>

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
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { analyzeJobMatch, askInterviewQuestion } from '@/api/ai'
import { getErrorDisplayMessage } from '@/api/error'
import type { ChatAssistantResult, JobAdviceResult } from '@/types'

const activeTab = ref<'chat' | 'match'>('chat')
const question = ref('')
const jd = ref('')
const resumeText = ref('')

const chatLoading = ref(false)
const jobLoading = ref(false)
const chatResult = ref<ChatAssistantResult | null>(null)
const jobResult = ref<JobAdviceResult | null>(null)

async function onAskQuestion() {
  const q = question.value.trim()
  if (!q) {
    ElMessage.warning('请先输入问题')
    return
  }

  chatLoading.value = true
  try {
    chatResult.value = await askInterviewQuestion(q)
  } catch (error) {
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
