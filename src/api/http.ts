import axios from 'axios'

const http = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:3001'
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export default http
