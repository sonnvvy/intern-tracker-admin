export interface ResumeAnalysisResult {
  name: string
  education: string
  major: string
  skills: string[]
  projects: string[]
  internships: string[]
  jobDirections: string[]
  advice: string[]
}

export class HttpError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
    this.name = 'HttpError'
  }
}
