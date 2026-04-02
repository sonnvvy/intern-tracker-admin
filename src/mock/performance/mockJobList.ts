import type { JobListItem, JobStatus } from '@/types/performance'

const COMPANY_PREFIX = ['星河', '青禾', '远景', '云帆', '极客', '新芽', '智行', '飞鸟', '零一', '光年']
const COMPANY_SUFFIX = ['科技', '数据', '网络', '软件', '信息', '智能', '创新', '互娱']
const JOB_TITLES = ['前端开发实习生', '前端工程师', 'Vue 前端开发', '全栈开发实习生', 'Web 开发工程师']
const CITIES = ['北京', '上海', '深圳', '杭州', '成都', '广州', '南京', '苏州', '武汉', '西安']
const SALARY_RANGES = ['120-180/天', '150-220/天', '180-260/天', '8k-12k', '12k-18k', '15k-20k']
const STATUS_POOL: JobStatus[] = ['待投递', '已投递', '笔试中', '面试中', '已 Offer', '已结束']
const TAG_POOL = ['Vue3', 'TypeScript', '远程', '可转正', '双休', '大厂背景', '低代码', 'Node.js', '组件化']
const REMARK_POOL = [
  '团队技术氛围不错，面试官强调组件抽象能力。',
  '需要补充一个中后台项目的性能优化案例。',
  '岗位偏业务开发，节奏较快，建议准备状态管理方案。',
  'HR 反馈较积极，下一轮可能会问工程化与 CI/CD。',
  '当前卡在笔试阶段，重点复盘算法与手写题。'
]

function pickByIndex<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function buildCompanyName(index: number): string {
  const prefix = pickByIndex(COMPANY_PREFIX, index * 3 + randomInt(0, 9))
  const suffix = pickByIndex(COMPANY_SUFFIX, index * 5 + randomInt(0, 9))
  return `${prefix}${suffix}`
}

function buildTags(index: number): string[] {
  const size = randomInt(3, 5)
  const result = new Set<string>()
  for (let i = 0; i < size; i += 1) {
    result.add(pickByIndex(TAG_POOL, index + i * 7 + randomInt(0, 8)))
  }
  return Array.from(result)
}

function buildUpdateTime(index: number): string {
  const now = Date.now()
  const dayOffset = (index % 30) * 24 * 60 * 60 * 1000
  const randomOffset = randomInt(0, 24 * 60 * 60 * 1000)
  const date = new Date(now - dayOffset - randomOffset)
  const yyyy = date.getFullYear()
  const mm = `${date.getMonth() + 1}`.padStart(2, '0')
  const dd = `${date.getDate()}`.padStart(2, '0')
  const hh = `${date.getHours()}`.padStart(2, '0')
  const mi = `${date.getMinutes()}`.padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

export function generateMockJobList(count: number): JobListItem[] {
  return Array.from({ length: count }, (_, index) => {
    const id = index + 1
    return {
      id,
      company: buildCompanyName(index),
      jobTitle: pickByIndex(JOB_TITLES, index + randomInt(0, JOB_TITLES.length - 1)),
      city: pickByIndex(CITIES, index + randomInt(0, CITIES.length - 1)),
      salary: pickByIndex(SALARY_RANGES, index + randomInt(0, SALARY_RANGES.length - 1)),
      status: pickByIndex(STATUS_POOL, index + randomInt(0, STATUS_POOL.length - 1)),
      tags: buildTags(index),
      updateTime: buildUpdateTime(index),
      remark: pickByIndex(REMARK_POOL, index + randomInt(0, REMARK_POOL.length - 1)),
      image: `https://picsum.photos/seed/job-card-${id}/120/120`
    }
  })
}
