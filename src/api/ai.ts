import axios from 'axios'
import type { ResumeAnalysisResult } from '@/types'

export async function analyzeResume(file: File): Promise<ResumeAnalysisResult> {
  const formData = new FormData()
  formData.append('file', file)

  const { data } = await axios.post<ResumeAnalysisResult>('/ai/resume/analyze', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })

  return data
}
