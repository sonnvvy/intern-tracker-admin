export const JOB_LIST_SIZES = [100, 1000, 5000, 10000] as const

export type JobListSize = (typeof JOB_LIST_SIZES)[number]

export type RenderMode = 'normal' | 'virtual'

export type JobStatus = '待投递' | '已投递' | '笔试中' | '面试中' | '已 Offer' | '已结束'

export interface JobListItem {
  id: number
  company: string
  jobTitle: string
  city: string
  salary: string
  status: JobStatus
  tags: string[]
  updateTime: string
  remark: string
  image: string
}

export interface PerformanceStatsData {
  dataSize: number
  renderMode: RenderMode
  renderedCount: number
  filteredCount: number
  firstRenderDuration: number
  isVirtualEnabled: boolean
  showImage: boolean
  refreshTime: string
}

export type JobActionType = 'view' | 'edit' | 'delete'
