import { NextFunction, Request, Response, Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import { config } from '../config.js'
import { extractResumeText } from '../services/extract.js'
import { analyzeResumeByLlm } from '../services/llm.js'
import { HttpError } from '../types.js'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxFileSize,
    files: 1
  }
})

function getExt(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  return ext.startsWith('.') ? ext.slice(1) : ext
}

function validateFile(file: Express.Multer.File | undefined): asserts file is Express.Multer.File {
  if (!file) {
    throw new HttpError(400, '请上传简历文件，字段名必须为 file')
  }

  const ext = getExt(file.originalname)
  if (!['pdf', 'doc', 'docx'].includes(ext)) {
    throw new HttpError(400, '文件类型不支持，仅允许 pdf/doc/docx')
  }

  if (file.size > config.maxFileSize) {
    throw new HttpError(400, '文件大小不能超过 10MB')
  }
}

router.post('/resume/analyze', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  const traceId = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
  try {
    console.info(`[analyze:${traceId}] request start`)
    console.info(`[analyze:${traceId}] env check`, {
      hasLlmApiKey: Boolean(process.env.LLM_API_KEY),
      llmApiUrl: process.env.LLM_API_URL ?? process.env.LLM_BASE_URL ?? config.llmApiUrl,
      llmModel: process.env.LLM_MODEL ?? config.llmModel
    })

    validateFile(req.file)
    console.info(`[analyze:${traceId}] file accepted`, {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    })

    const text = await extractResumeText(req.file.buffer, req.file.originalname, req.file.mimetype)
    console.info(`[analyze:${traceId}] extracted text length`, { length: text.length })

    const llmOutput = await analyzeResumeByLlm(text)
    console.info(`[analyze:${traceId}] llm raw response`, llmOutput.rawResponse)
    console.info(`[analyze:${traceId}] llm raw content`, llmOutput.rawContent)

    res.json(llmOutput.result)
  } catch (error: unknown) {
    const err = error as {
      message?: string
      response?: { data?: unknown }
      status?: number
      cause?: unknown
    }

    const statusCode = error instanceof HttpError ? error.statusCode : err?.status ?? 500

    console.error(`[analyze:${traceId}] request failed`, {
      message: err?.message ?? 'unknown error',
      status: statusCode,
      detail: err?.response?.data,
      cause: err?.cause
    })

    res.status(statusCode).json({
      message: err?.message ?? '服务器内部错误',
      detail: err?.response?.data
    })
    return
  }
})

export default router
