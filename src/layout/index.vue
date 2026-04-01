<template>
  <div class="layout">
    <aside v-if="!isMobile" class="sidebar" :class="{ hidden: appStore.isCollapse }">
      <div class="logo">
        <span class="logo-mark">
          <Audit theme="outline" :size="18" fill="currentColor" />
        </span>
        <span v-show="!appStore.isCollapse">求职进度台</span>
      </div>
      <el-menu :default-active="activeMenu" class="menu" router @select="handleMenuSelect">
        <el-menu-item index="/dashboard">
          <el-icon><House /></el-icon>
          <span>总览面板</span>
        </el-menu-item>
        <el-menu-item index="/delivery">
          <el-icon><Tickets /></el-icon>
          <span>岗位投递</span>
        </el-menu-item>
        <el-menu-item index="/interview">
          <el-icon><Memo /></el-icon>
          <span>面试复盘</span>
        </el-menu-item>
        <el-menu-item index="/ai-resume">
          <el-icon><Document /></el-icon>
          <span>AI 简历解析</span>
        </el-menu-item>
      </el-menu>
    </aside>

    <el-drawer
      v-model="mobileMenuVisible"
      direction="ltr"
      size="220px"
      :with-header="false"
      class="mobile-menu-drawer"
    >
      <div class="logo mobile-logo">
        <span class="logo-mark">
          <Audit theme="outline" :size="18" fill="currentColor" />
        </span>
        <span>求职进度台</span>
      </div>
      <el-menu :default-active="activeMenu" class="menu mobile-menu" router @select="handleMenuSelect">
        <el-menu-item index="/dashboard">
          <el-icon><House /></el-icon>
          <span>总览面板</span>
        </el-menu-item>
        <el-menu-item index="/delivery">
          <el-icon><Tickets /></el-icon>
          <span>岗位投递</span>
        </el-menu-item>
        <el-menu-item index="/interview">
          <el-icon><Memo /></el-icon>
          <span>面试复盘</span>
        </el-menu-item>
        <el-menu-item index="/ai-resume">
          <el-icon><Document /></el-icon>
          <span>AI 简历解析</span>
        </el-menu-item>
      </el-menu>
    </el-drawer>

    <div class="main">
      <header class="header">
        <div class="left">
          <el-button v-if="isMobile" text class="mobile-menu-btn" @click="mobileMenuVisible = true">
            <el-icon><Menu /></el-icon>
          </el-button>
          <el-button v-else text @click="appStore.toggleCollapse()">
            <el-icon><Expand /></el-icon>
          </el-button>
          <span class="header-title">{{ route.meta.title }}</span>
        </div>
        <div class="right">
          <el-tag type="success">{{ userStore.userInfo.role }}</el-tag>
          <span class="username">{{ userStore.userInfo.name }}</span>
          <el-button type="danger" plain @click="handleLogout">退出登录</el-button>
        </div>
      </header>
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Audit } from '@icon-park/vue-next'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const userStore = useUserStore()

const activeMenu = computed(() => route.path)
const isMobile = ref(false)
const mobileMenuVisible = ref(false)

function handleResize() {
  isMobile.value = window.innerWidth < 768
  if (!isMobile.value) {
    mobileMenuVisible.value = false
  }
}

function handleMenuSelect() {
  if (isMobile.value) {
    mobileMenuVisible.value = false
  }
}

function handleLogout() {
  userStore.logout()
  router.push('/login')
}

onMounted(() => {
  handleResize()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped lang="scss">
.layout {
  min-height: 100vh;
  display: flex;
}

.sidebar {
  width: 220px;
  height: 100vh;
  position: sticky;
  top: 0;
  align-self: flex-start;
  background: #111827;
  color: #fff;
  transition: all 0.25s ease;
  flex-shrink: 0;
  overflow: hidden;

  &.hidden {
    width: 0;
    opacity: 0;
    pointer-events: none;
    transform: translateX(-12px);
  }

  .logo {
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 1px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .logo-mark {
    width: 34px;
    height: 34px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: linear-gradient(135deg, #60a5fa, #818cf8);
    color: #fff;
    box-shadow: 0 8px 20px rgba(96, 165, 250, 0.28);
    flex-shrink: 0;
  }

  .menu {
    border-right: none;
    background: transparent;
  }
}

.mobile-logo {
  justify-content: flex-start;
  color: #111827;
  border-bottom: 1px solid #eef2f7;
  padding: 0 8px;
}

.mobile-menu-btn {
  font-size: 18px;
}

:deep(.mobile-menu-drawer .el-drawer__body) {
  padding: 0;
}

:deep(.mobile-menu) {
  border-right: none;
}

:deep(.mobile-menu .el-menu-item) {
  color: #1f2937;
}

:deep(.mobile-menu .el-menu-item.is-active) {
  color: #2563eb;
  background: #eff6ff;
}

:deep(.el-menu) {
  background: transparent;
}

:deep(.el-menu-item) {
  color: rgba(255, 255, 255, 0.88);
}

:deep(.el-menu-item.is-active) {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.header {
  height: 64px;
  padding: 0 20px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 14px rgba(15, 23, 42, 0.04);

  .left,
  .right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .header-title {
    font-size: 18px;
    font-weight: 600;
  }

  .username {
    font-weight: 600;
  }
}

.content {
  flex: 1;
  padding: 20px;
  min-width: 0;
}

@media (max-width: 767px) {
  .header {
    padding: 0 12px;

    .header-title {
      font-size: 16px;
    }

    .right {
      gap: 8px;
    }

    .username {
      display: none;
    }
  }

  .content {
    padding: 12px;
  }
}
</style>
