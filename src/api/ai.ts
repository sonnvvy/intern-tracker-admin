import axios from 'axios'
import type { ResumeAnalysisResult } from '@/types'

function normalizeBaseUrl(baseUrl: string | undefined): string {
  if (!baseUrl || !baseUrl.trim()) {
    return '/ai'
  }
  return baseUrl.replace(/\/$/, '')
}

const apiClient = axios.create({
  baseURL: normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL)
})

export async function analyzeResume(file: File): Promise<ResumeAnalysisResult> {
  const formData = new FormData()
  formData.append('file', file)

  const { data } = await apiClient.post<ResumeAnalysisResult>('/resume/analyze', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })

  return data
}
