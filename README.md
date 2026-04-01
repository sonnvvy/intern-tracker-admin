# Intern Tracker Admin（求职管理系统）

一个前后端分离的求职管理系统，用于统一管理岗位投递、面试复盘、数据看板和 AI 简历解析流程。

前端聚焦中后台常见业务能力（表格、筛选、分页、状态流转、可视化）；后端提供简历上传与结构化解析接口，支持 PDF/DOC/DOCX。

## 1. 项目特性

- 岗位投递管理：搜索、筛选、分页、新增/编辑/删除、状态流转、跟进时间线
- 面试复盘管理：复盘记录、标签统计、结果筛选
- 仪表盘看板：投递状态分布、投递节奏趋势、待办提醒
- AI 简历解析：文件上传、文本提取、LLM 结构化输出
- 本地持久化：登录态、业务数据、页面筛选/分页/导出配置缓存
- 性能优化：路由懒加载、异步组件、重依赖动态加载、防抖/节流、骨架屏

## 2. 技术栈

### 前端

- Vue 3（Composition API）
- TypeScript
- Vite
- Vue Router
- Pinia
- Element Plus
- ECharts
- xlsx
- SCSS

### 后端

- Node.js + Express
- TypeScript + tsx
- multer（文件上传）
- pdf-parse / mammoth / word-extractor（文本提取）
- OpenAI 兼容接口（LLM 结构化）

## 3. 目录结构

```text
intern-tracker-admin
├─ src/                     # 前端源码
│  ├─ views/                # 页面（dashboard、delivery、interview、ai-resume、login）
│  ├─ stores/               # Pinia 状态
│  ├─ components/           # 通用组件
│  ├─ utils/                # 工具函数（性能工具、状态机）
│  └─ api/                  # 前端接口封装
├─ backend/                 # 后端服务
│  ├─ src/routes/           # 路由（/ai/resume/analyze）
│  ├─ src/services/         # 文本提取、LLM 调用
│  └─ src/config.ts         # 环境变量配置
└─ README.md
```

## 4. 快速开始

## 4.1 环境要求

- Node.js 18+
- npm 9+

## 4.2 安装依赖

```bash
# 前端
npm install

# 后端
cd backend
npm install
```

## 4.3 配置后端环境变量

在 backend 目录创建 .env（项目里已支持 dotenv 自动读取）：

```env
# 服务端口
BACKEND_PORT=3001

# LLM 配置（必填）
LLM_API_URL=https://api.openai.com/v1
LLM_API_KEY=your_api_key
LLM_MODEL=gpt-4o-mini

# OCR 可选（按需）
OCR_API_URL=
OCR_API_KEY=
```

说明：

- 如果未配置 LLM_API_KEY，AI 解析接口会返回服务配置错误。
- 前端开发服务器通过 Vite 代理将 /ai 转发到 http://localhost:3001。

## 4.4 启动项目

先启动后端，再启动前端。

```bash
# 终端 1：后端
cd backend
npm run dev

# 终端 2：前端
npm run dev
```

访问：

- 前端：http://localhost:5173
- 后端健康检查：http://localhost:3001/health

## 4.5 生产构建

```bash
# 前端构建
npm run build

# 后端构建与运行
cd backend
npm run build
npm run start
```

## 5. 核心业务说明

## 5.1 岗位投递模块

- 支持公司名/岗位名/城市关键字搜索
- 支持状态、优先级筛选
- 支持分页渲染，避免一次性渲染全量数据
- 支持合法状态流转（状态机约束）
- 支持跟进记录时间线
- 支持可配置字段 Excel 导出（当前页/全部）

## 5.2 面试复盘模块

- 支持复盘记录录入与结果筛选
- 支持知识点标签聚合统计
- 为后续复习与面试准备提供结构化参考

## 5.3 仪表盘模块

- 统计卡片：累计投递、推进中、已拿机会、待跟进面试
- 状态分布图：展示投递状态结构
- 趋势图：展示投递节奏
- 待办项：基于投递记录自动计算

## 5.4 AI 简历解析模块

接口：

- 方法：POST
- 路径：/ai/resume/analyze
- Content-Type：multipart/form-data
- 文件字段：file
- 文件类型：pdf/doc/docx
- 文件大小：<= 10MB

返回字段（固定 key）：

```json
{
  "name": "string",
  "education": "string",
  "major": "string",
  "skills": ["string"],
  "projects": ["string"],
  "internships": ["string"],
  "jobDirections": ["string"],
  "advice": ["string"]
}
```

## 6. 性能优化（已落地）

## 6.1 加载性能

- 路由懒加载：页面按需加载，降低首屏体积
- 异步组件：部分展示组件通过 defineAsyncComponent 延迟加载
- 动态依赖加载：xlsx 与 echarts 使用 import()，仅在功能触发时下载
- Element Plus 按需引入：结合 unplugin-auto-import / unplugin-vue-components

## 6.2 渲染性能

- 表格分页 + 筛选 + 搜索联动，控制单次渲染量
- computed 汇总派生数据，减少模板重复计算
- 列表与图表使用骨架屏，降低白屏体感

## 6.3 交互性能

- 手写 debounce：控制搜索输入触发频率
- 手写 throttle：控制 resize 高频触发
- loading + disabled：防止重复点击触发重复请求

## 6.4 当前构建数据（本地实测）

以下数据来自一次 npm run build 输出（vite v6.4.1）：

- 构建耗时：9.79s
- 生成 JS chunk 数：19
- 关键分包：
  - index 主包：1043.71 kB（gzip 346.48 kB）
  - vendor-element-plus：903.42 kB（gzip 291.32 kB）
  - xlsx：429.53 kB（gzip 143.08 kB，动态加载）
  - vendor-vue：110.41 kB（gzip 43.12 kB）

说明：上述为单次构建结果，用于现状说明；如需前后优化百分比，请在同环境采集基线后对比。

## 7. 数据持久化说明

- localStorage 用于保存：
  - 登录态与用户信息
  - 投递与面试业务数据
  - 投递页筛选条件、分页参数、导出列配置
- 刷新后可恢复主要工作现场，减少重复操作成本。

## 8. 常见问题排查

## 8.1 前端无法调用 AI 接口

- 确认后端已启动在 3001 端口
- 确认前端通过 /ai 路径请求（由 Vite 代理）
- 检查后端控制台错误日志

## 8.2 AI 解析返回 500

- 检查 backend/.env 是否配置 LLM_API_KEY
- 检查 LLM_API_URL、LLM_MODEL 是否可用
- 检查上传文件格式与大小是否符合限制

## 8.3 上传失败或类型不支持

- 仅支持 pdf/doc/docx
- 文件必须使用 file 字段上传
- 文件大小不能超过 10MB

## 9. 后续可扩展方向

- 接入真实鉴权与多用户权限模型
- 增加后端数据库（当前为本地持久化演示）
- 引入埋点与 Web Vitals，做持续性能监控
- 为超大表格场景引入虚拟滚动

## 10. License

仅用于学习、演示与求职项目展示。
