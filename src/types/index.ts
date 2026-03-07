export type DeliveryStatus = '已投递' | '笔试中' | '面试中' | '已录用' | '已拒绝'
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
