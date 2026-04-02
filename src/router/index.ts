import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/login/index.vue'),
      meta: { title: '登录' }
    },
    {
      path: '/',
      component: () => import('@/layout/index.vue'),
      redirect: '/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/dashboard/index.vue'),
          meta: { title: '总览面板' }
        },
        {
          path: 'delivery',
          name: 'delivery',
          component: () => import('@/views/delivery/index.vue'),
          meta: { title: '岗位投递' }
        },
        {
          path: 'interview',
          name: 'interview',
          component: () => import('@/views/interview/index.vue'),
          meta: { title: '面试复盘' }
        },
        {
          path: 'ai-resume',
          name: 'aiResume',
          component: () => import('@/views/ai-resume/index.vue'),
          meta: { title: 'AI 简历解析' }
        },
        {
          path: 'performance-long-list',
          name: 'performanceLongList',
          component: () => import('@/views/performance/LongListPerformancePage.vue'),
          meta: { title: '长列表性能测试' }
        }
      ]
    }
  ]
})

// 白名单页面（无需登录可访问）
const whiteList = ['/login']

router.beforeEach((to, _from, next) => {
  const userStore = useUserStore()

  // 如果访问的是受保护的页面但未登录
  if (!whiteList.includes(to.path) && !userStore.isLoggedIn) {
    // 保存原本要访问的页面
    sessionStorage.setItem('redirectFrom', to.path)
    next('/login')
    return
  }

  // 如果已登录且访问登录页，则重定向到首页
  if (to.path === '/login' && userStore.isLoggedIn) {
    next('/dashboard')
    return
  }

  // 仅测试账号可访问性能测试页
  if (to.path.startsWith('/performance-long-list') && !userStore.canAccessPerformancePage) {
    next('/dashboard')
    return
  }

  next()
})

/**
 * 获取登录后应该重定向到的页面
 * 优先级：原本要访问的页面 > 首页
 */
export function getRedirectPath(): string {
  const redirect = sessionStorage.getItem('redirectFrom')
  sessionStorage.removeItem('redirectFrom')
  return redirect || '/dashboard'
}

export default router
