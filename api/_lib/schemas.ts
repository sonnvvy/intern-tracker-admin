import { z } from 'zod'

export const chatAssistantSchema = z.object({
  answer: z.string().describe('建议回答，适合直接用于面试表达'),
  keyPoints: z.array(z.string()).describe('回答时可重点展开的要点列表'),
  followUps: z.array(z.string()).describe('面试官可能追问的问题方向'),
  confidence: z.enum(['low', 'medium', 'high']).describe('对该回答质量的信心等级')
})

export const jobAdviceSchema = z.object({
  matchScore: z.number().min(0).max(100).describe('岗位匹配度百分制分数'),
  missingSkills: z.array(z.string()).describe('和 JD 相比缺失或薄弱的技能'),
  resumeImprovements: z.array(z.string()).describe('可直接执行的简历优化建议'),
  interviewPrep: z.array(z.string()).describe('针对该岗位的面试准备建议'),
  summary: z.string().describe('综合评估结论')
})

export type ChatAssistantResult = z.infer<typeof chatAssistantSchema>
export type JobAdviceResult = z.infer<typeof jobAdviceSchema>
