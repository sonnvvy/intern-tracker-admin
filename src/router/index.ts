import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = createRouter({
  history: createWebHistory(),
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
        }
      ]
    }
  ]
})

router.beforeEach((to) => {
  const userStore = useUserStore()
  if (to.path !== '/login' && !userStore.isLoggedIn) {
    return '/login'
  }
  if (to.path === '/login' && userStore.isLoggedIn) {
    return '/dashboard'
  }
  return true
})

export default router
