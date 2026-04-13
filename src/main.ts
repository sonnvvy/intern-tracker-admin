import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { ElMessage } from 'element-plus'
import App from './App.vue'
import router from './router'
import { getErrorDisplayMessage } from './api/error'
import './styles/index.scss'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.config.errorHandler = (error) => {
  ElMessage.error(getErrorDisplayMessage(error, '页面发生异常，请稍后重试'))
}

window.addEventListener('unhandledrejection', (event) => {
  ElMessage.error(getErrorDisplayMessage(event.reason, '请求处理失败，请稍后重试'))
})

app.mount('#app')
