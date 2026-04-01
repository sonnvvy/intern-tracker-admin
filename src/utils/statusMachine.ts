export const JOB_STATUS = {
  APPLIED: 'APPLIED',
  WRITTEN_TEST: 'WRITTEN_TEST',
  FIRST_INTERVIEW: 'FIRST_INTERVIEW',
  SECOND_INTERVIEW: 'SECOND_INTERVIEW',
  OFFER: 'OFFER',
  HIRED: 'HIRED',
  REJECTED: 'REJECTED'
} as const

export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS]

export const statusLabelMap: Record<JobStatus, string> = {
  [JOB_STATUS.APPLIED]: '已投递',
  [JOB_STATUS.WRITTEN_TEST]: '笔试',
  [JOB_STATUS.FIRST_INTERVIEW]: '一面',
  [JOB_STATUS.SECOND_INTERVIEW]: '二面',
  [JOB_STATUS.OFFER]: '已拿offer',
  [JOB_STATUS.HIRED]: '入职',
  [JOB_STATUS.REJECTED]: '已拒绝'
}

export const statusTagTypeMap: Record<JobStatus, 'info' | 'warning' | 'primary' | 'success' | 'danger'> = {
  [JOB_STATUS.APPLIED]: 'info',
  [JOB_STATUS.WRITTEN_TEST]: 'warning',
  [JOB_STATUS.FIRST_INTERVIEW]: 'primary',
  [JOB_STATUS.SECOND_INTERVIEW]: 'primary',
  [JOB_STATUS.OFFER]: 'success',
  [JOB_STATUS.HIRED]: 'success',
  [JOB_STATUS.REJECTED]: 'danger'
}

export const statusFlowOrder: JobStatus[] = [
  JOB_STATUS.APPLIED,
  JOB_STATUS.WRITTEN_TEST,
  JOB_STATUS.FIRST_INTERVIEW,
  JOB_STATUS.SECOND_INTERVIEW,
  JOB_STATUS.OFFER,
  JOB_STATUS.HIRED,
  JOB_STATUS.REJECTED
]

const transitionsMap: Record<JobStatus, JobStatus[]> = {
  [JOB_STATUS.APPLIED]: [JOB_STATUS.WRITTEN_TEST, JOB_STATUS.FIRST_INTERVIEW, JOB_STATUS.REJECTED],
  [JOB_STATUS.WRITTEN_TEST]: [JOB_STATUS.FIRST_INTERVIEW, JOB_STATUS.REJECTED],
  [JOB_STATUS.FIRST_INTERVIEW]: [JOB_STATUS.SECOND_INTERVIEW, JOB_STATUS.REJECTED],
  [JOB_STATUS.SECOND_INTERVIEW]: [JOB_STATUS.OFFER, JOB_STATUS.REJECTED],
  [JOB_STATUS.OFFER]: [JOB_STATUS.HIRED, JOB_STATUS.REJECTED],
  [JOB_STATUS.HIRED]: [],
  [JOB_STATUS.REJECTED]: []
}

const legacyStatusMap: Record<string, JobStatus> = {
  已投递: JOB_STATUS.APPLIED,
  笔试中: JOB_STATUS.WRITTEN_TEST,
  笔试: JOB_STATUS.WRITTEN_TEST,
  面试中: JOB_STATUS.FIRST_INTERVIEW,
  一面: JOB_STATUS.FIRST_INTERVIEW,
  二面: JOB_STATUS.SECOND_INTERVIEW,
  已录用: JOB_STATUS.OFFER,
  已拿offer: JOB_STATUS.OFFER,
  入职: JOB_STATUS.HIRED,
  已拒绝: JOB_STATUS.REJECTED,
  拒绝: JOB_STATUS.REJECTED
}

export function normalizeJobStatus(status: string): JobStatus {
  if ((Object.values(JOB_STATUS) as string[]).includes(status)) {
    return status as JobStatus
  }
  return legacyStatusMap[status] ?? JOB_STATUS.APPLIED
}

export function getNextStatusList(currentStatus: JobStatus): JobStatus[] {
  return transitionsMap[currentStatus] ?? []
}

export function canTransfer(from: JobStatus, to: JobStatus): boolean {
  return getNextStatusList(from).includes(to)
}

export function isTerminalStatus(status: JobStatus): boolean {
  return getNextStatusList(status).length === 0
}
