import type { DeliveryItem, InterviewItem } from '@/types'

export const deliverySeeds: DeliveryItem[] = [
  {
    id: 1,
    companyName: '云岫科技',
    jobTitle: '前端开发实习生',
    channel: '官网投递',
    status: '面试中',
    deliveryDate: '2026-03-05',
    city: '苏州',
    priority: '高优先级',
    nextStep: '继续准备二面题目和项目讲解',
    remark: '一面结束，已整理问题复盘',
    followUps: [
      { id: 11, date: '2026-03-05', action: '完成投递', note: '官网提交简历后同步记录岗位要求。' },
      { id: 12, date: '2026-03-06', action: '收到面试通知', note: '约到晚上 19:30 进行一面。' },
      { id: 13, date: '2026-03-07', action: '完成一面', note: '主要问 Vue3 响应式和项目表单封装。' }
    ]
  },
  {
    id: 2,
    companyName: '青禾数据',
    jobTitle: 'Web 前端实习生',
    channel: '招聘平台',
    status: '已投递',
    deliveryDate: '2026-03-03',
    city: '杭州',
    priority: '正常跟进',
    nextStep: '两天后查看是否有笔试通知',
    remark: '岗位偏中后台方向，已收藏 JD',
    followUps: [
      { id: 21, date: '2026-03-03', action: '完成投递', note: '同步记录技术栈要求：Vue3、TS、Pinia。' }
    ]
  },
  {
    id: 3,
    companyName: '星屿网络',
    jobTitle: '前端工程师实习生',
    channel: '内推登记',
    status: '已拒绝',
    deliveryDate: '2026-03-01',
    city: '上海',
    priority: '正常跟进',
    nextStep: '继续跟进同类岗位，不再投入额外时间',
    remark: '岗位暂停招募，准备继续跟进同类岗位',
    followUps: [
      { id: 31, date: '2026-03-01', action: '完成投递', note: '通过内推登记表提交。' },
      { id: 32, date: '2026-03-02', action: '状态变更', note: '岗位冻结，后续不再追加准备时间。' }
    ]
  },
  {
    id: 4,
    companyName: '木川软件',
    jobTitle: 'Vue 前端实习生',
    channel: '官网投递',
    status: '笔试中',
    deliveryDate: '2026-03-06',
    city: '南京',
    priority: '高优先级',
    nextStep: '周末完成在线测评并复习 JS 基础',
    remark: '在线测评 90 分钟，周末前完成',
    followUps: [
      { id: 41, date: '2026-03-06', action: '完成投递', note: '岗位更偏组件化和中后台开发。' },
      { id: 42, date: '2026-03-07', action: '收到测评链接', note: '题型以 JS、网络请求和场景题为主。' }
    ]
  },
  {
    id: 5,
    companyName: '临风智联',
    jobTitle: '前端开发实习生',
    channel: '校园招聘',
    status: '已录用',
    deliveryDate: '2026-02-26',
    city: '无锡',
    priority: '保底机会',
    nextStep: '确认到岗时间，继续对比其他机会',
    remark: '已沟通到岗时间，作为保底机会',
    followUps: [
      { id: 51, date: '2026-02-26', action: '完成投递', note: '校园渠道提交。' },
      { id: 52, date: '2026-03-01', action: '完成 HR 面', note: '主要确认到岗时间和实习周期。' },
      { id: 53, date: '2026-03-02', action: '收到结果', note: '可作为保底机会，后续继续横向比较。' }
    ]
  },
  {
    id: 6,
    companyName: '栖川互动',
    jobTitle: '前端实习生',
    channel: '招聘平台',
    status: '已投递',
    deliveryDate: '2026-03-07',
    city: '成都',
    priority: '正常跟进',
    nextStep: '等待 HR 联系，补充该公司的业务了解',
    remark: '岗位要求熟悉 Vue3 和 TypeScript',
    followUps: [
      { id: 61, date: '2026-03-07', action: '完成投递', note: '后续需要补充业务方向调研。' }
    ]
  }
]

export const interviewSeeds: InterviewItem[] = [
  {
    id: 1,
    companyName: '云岫科技',
    jobTitle: '前端开发实习生',
    round: '一面',
    interviewDate: '2026-03-07 19:30',
    interviewer: '前端负责人',
    result: '待通知',
    summary: '重点问了 Vue3 响应式、Pinia 使用场景、项目中表格和表单的封装思路。',
    questionTags: ['Vue3', 'Pinia', '组件封装']
  },
  {
    id: 2,
    companyName: '木川软件',
    jobTitle: 'Vue 前端实习生',
    round: '笔试',
    interviewDate: '2026-03-08 14:00',
    interviewer: '在线测评',
    result: '待开始',
    summary: '以 JS 基础、网络请求和页面题为主，预计 90 分钟。',
    questionTags: ['JavaScript', '网络请求', '页面题']
  },
  {
    id: 3,
    companyName: '临风智联',
    jobTitle: '前端开发实习生',
    round: 'HR 面',
    interviewDate: '2026-03-01 10:00',
    interviewer: '招聘专员',
    result: '通过',
    summary: '主要沟通实习时间、通勤情况和到岗安排。',
    questionTags: ['到岗时间', '沟通表达']
  }
]
