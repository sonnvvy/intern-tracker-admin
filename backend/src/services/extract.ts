import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import mammoth from 'mammoth'
import pdfParse from 'pdf-parse'
import WordExtractor from 'word-extractor'
import { config } from '../config.js'
import { HttpError } from '../types.js'

const extractor = new WordExtractor()

function getExt(filename: string): string {
  const extension = path.extname(filename).toLowerCase()
  return extension.startsWith('.') ? extension.slice(1) : extension
}

async function extractDocText(buffer: Buffer): Promise<string> {
  const tempPath = path.join(os.tmpdir(), `resume-${Date.now()}-${Math.random().toString(16).slice(2)}.doc`)
  await fs.writeFile(tempPath, buffer)
  try {
    const document = await extractor.extract(tempPath)
    return document.getBody()
  } finally {
    await fs.unlink(tempPath).catch(() => {
      return undefined
    })
  }
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parsed = await pdfParse(buffer)
  return parsed.text ?? ''
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  return result.value ?? ''
}

function hasEnoughText(text: string): boolean {
  return text.replace(/\s+/g, '').length >= 40
}

async function callOcrFallback(file: Buffer, filename: string, mimetype: string): Promise<string> {
  if (!config.ocrApiUrl) {
    throw new HttpError(500, 'OCR 服务未配置，请联系管理员配置 OCR_API_URL')
  }

  const formData = new FormData()
  const fileBytes = Uint8Array.from(file)
  const blob = new Blob([fileBytes], { type: mimetype || 'application/octet-stream' })
  formData.append('file', blob, filename)

  const headers: HeadersInit = {}
  if (config.ocrApiKey) {
    headers.Authorization = `Bearer ${config.ocrApiKey}`
  }

  const response = await fetch(config.ocrApiUrl, {
    method: 'POST',
    headers,
    body: formData
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new HttpError(502, `OCR 服务调用失败：${detail || response.statusText}`)
  }

  const data: unknown = await response.json()
  if (!data || typeof data !== 'object') {
    throw new HttpError(502, 'OCR 服务返回格式无效')
  }

  const text = (data as { text?: unknown }).text
  if (typeof text !== 'string') {
    throw new HttpError(502, 'OCR 服务未返回可用文本')
  }

  return text
}

export async function extractResumeText(fileBuffer: Buffer, filename: string, mimetype: string): Promise<string> {
  const ext = getExt(filename)
  let text = ''

  if (ext === 'pdf') {
    text = await extractPdfText(fileBuffer)
    if (!hasEnoughText(text)) {
      text = await callOcrFallback(fileBuffer, filename, mimetype)
    }
  } else if (ext === 'docx') {
    text = await extractDocxText(fileBuffer)
  } else if (ext === 'doc') {
    text = await extractDocText(fileBuffer)
  } else {
    throw new HttpError(400, '仅支持 pdf/doc/docx 文件类型')
  }

  const normalized = text.trim()
  if (!normalized) {
    throw new HttpError(422, '简历未提取到有效文本，请上传更清晰的文件')
  }

  return normalized
}
