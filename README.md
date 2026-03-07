# 前端实习求职管理台

一个基于 Vue3 + TypeScript + Pinia + Vite + Element Plus 搭建的个人后台项目，用来管理岗位投递、面试安排和复盘内容。

## 技术栈

- Vue 3
- TypeScript
- Pinia
- Vite
- Vue Router
- Element Plus
- ECharts
- SCSS

## 已实现功能

- 登录页与基础路由守卫
- 后台布局与侧边栏折叠
- 基于 Pinia 的用户状态管理
- 岗位投递列表、筛选、分页、新增、编辑、删除
- 投递详情抽屉与优先级管理
- 面试复盘列表、标签化知识点记录、新增复盘
- 仪表盘统计卡片、状态分布图、投递趋势图
- 本地 localStorage 持久化，刷新后保留数据

## 项目亮点

1. **组合式 API + TypeScript**
   - 使用 `script setup` 和类型声明约束表单、表格与 store 数据结构。
2. **Pinia 状态管理**
   - 将投递数据、面试数据与用户状态拆分到不同 store 中，便于维护和复用。
3. **派生数据统计**
   - 在 store 中通过 `computed` 计算投递状态分布、趋势图数据和高频知识点标签。
4. **Element Plus 交互**
   - 实现表单校验、弹窗、抽屉、分页、标签、表格等常见后台交互。
5. **ECharts 可视化**
   - 通过饼图和折线图展示投递状态和投递节奏，并处理窗口 resize 自适应。
6. **本地持久化**
   - 使用 localStorage 保存登录态与业务数据，模拟真实后台系统的基础使用场景。

## 启动方式

```bash
npm install
npm run dev
```
