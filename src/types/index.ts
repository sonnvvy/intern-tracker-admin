import type { JobStatus } from '@/utils/statusMachine'

export type DeliveryStatus = JobStatus
export type InterviewResult = '待开始' | '通过' | '未通过' | '待通知'
export type PriorityLevel = '高优先级' | '正常跟进' | '保底机会'

export interface UserInfo {
  name: string
  role: string
}

export interface FollowUpRecord {
  id: number
  date: string
  action: string
  note: string
}

export interface DeliveryItem {
  id: number
  companyName: string
  jobTitle: string
  channel: string
  status: DeliveryStatus
  deliveryDate: string
  city: string
  priority: PriorityLevel
  nextStep: string
  remark?: string
  followUps: FollowUpRecord[]
}

export interface InterviewItem {
  id: number
  companyName: string
  jobTitle: string
  round: string
  interviewDate: string
  interviewer?: string
  result: InterviewResult
  summary?: string
  questionTags: string[]
}

export interface DashboardStats {
  total: number
  interviewing: number
  offered: number
  rejected: number
  upcomingInterview: number
}

export interface TodoItem {
  id: number
  title: string
  hint: string
  level: '紧急' | '优先' | '常规'
}

export interface ResumeAnalysisResult {
  name: string
  education: string
  major: string
  skills: string[]
  projects: string[]
  internships: string[]
  jobDirections: string[]
  advice: string[]
}

export interface ChatAssistantResult {
  answer: string
  keyPoints: string[]
  followUps: string[]
  confidence: 'low' | 'medium' | 'high'
}

export interface JobAdviceResult {
  matchScore: number
  missingSkills: string[]
  resumeImprovements: string[]
  interviewPrep: string[]
  summary: string
}
