import cors from 'cors'
import express from 'express'
import aiRouter from './routes/ai.js'
import { config } from './config.js'
import { HttpError } from './types.js'
import 'dotenv/config'

const app = express()

app.use(cors())
app.use(express.json({ limit: '2mb' }))
app.use('/ai', aiRouter)

app.get('/health', (_req: express.Request, res: express.Response) => {
  res.json({ status: 'ok' })
})

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ message: error.message })
    return
  }

  if (error instanceof Error && error.name === 'MulterError') {
    res.status(400).json({ message: '上传文件失败：请检查文件大小和数量限制' })
    return
  }

  const message = error instanceof Error ? error.message : '服务器内部错误'
  res.status(500).json({ message })
})

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`AI resume backend running at http://localhost:${config.port}`)
})
