import cors from 'cors'
import express from 'express'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import aiRouter from './routes/ai.js'
import { config } from './config.js'
import { pool } from './db.js'
import { HttpError } from './types.js'
import 'dotenv/config'

const app = express()

app.use(cors())
app.use(express.json({ limit: '2mb' }))
app.use('/ai', aiRouter)

app.get('/health', (_req: express.Request, res: express.Response) => {
  res.json({ status: 'ok' })
})

app.get('/deliveries', async (req, res) => {
  const keyword = typeof req.query.keyword === 'string' ? req.query.keyword.trim() : ''
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : ''
  const page = Math.max(Number(req.query.page) || 1, 1)
  const pageSize = Math.max(Number(req.query.pageSize) || 10, 1)
  const offset = (page - 1) * pageSize
  const whereList: string[] = []
  const params: Array<string | number> = []

  if (keyword) {
    whereList.push('(company LIKE ? OR position LIKE ?)')
    params.push(`%${keyword}%`, `%${keyword}%`)
  }

  if (status) {
    whereList.push('status = ?')
    params.push(status)
  }

  const whereSql = whereList.length > 0 ? ` WHERE ${whereList.join(' AND ')}` : ''
  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM deliveries${whereSql}`,
    params
  )
  const [rows] = await pool.query(
    `SELECT * FROM deliveries${whereSql} LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  )

  res.json({
    list: rows,
    total: Number(countRows[0]?.total ?? 0),
    page,
    pageSize
  })
})

app.post('/deliveries', async (req, res) => {
  const { company, position, status, city, channel, apply_date, note } = req.body as {
    company?: string
    position?: string
    status?: string
    city?: string
    channel?: string
    apply_date?: string
    note?: string
  }

  if (!company?.trim() || !position?.trim()) {
    res.status(400).json({ message: 'company 和 position 不能为空' })
    return
  }

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO deliveries (company, position, status, city, channel, apply_date, note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      company.trim(),
      position.trim(),
      status,
      city?.trim() || null,
      channel?.trim() || null,
      apply_date || null,
      note?.trim() || null
    ]
  )

  res.json({ message: '新增成功', id: result.insertId })
})

app.delete('/deliveries/:id', async (req, res) => {
  await pool.query('DELETE FROM deliveries WHERE id = ?', [req.params.id])
  res.json({ message: '删除成功' })
})

app.put('/deliveries/:id', async (req, res) => {
  const { company, position, status, city, channel, apply_date, note } = req.body as {
    company?: string
    position?: string
    status?: string
    city?: string
    channel?: string
    apply_date?: string
    note?: string
  }

  if (company !== undefined && !company.trim()) {
    res.status(400).json({ message: 'company 不能为空' })
    return
  }

  if (position !== undefined && !position.trim()) {
    res.status(400).json({ message: 'position 不能为空' })
    return
  }

  const setList: string[] = []
  const params: Array<string | null> = []

  if (company !== undefined) {
    setList.push('company = ?')
    params.push(company.trim())
  }
  if (position !== undefined) {
    setList.push('position = ?')
    params.push(position.trim())
  }
  if (status !== undefined) {
    setList.push('status = ?')
    params.push(status)
  }
  if (city !== undefined) {
    setList.push('city = ?')
    params.push(city.trim())
  }
  if (channel !== undefined) {
    setList.push('channel = ?')
    params.push(channel.trim())
  }
  if (apply_date !== undefined) {
    setList.push('apply_date = ?')
    params.push(apply_date || null)
  }
  if (note !== undefined) {
    setList.push('note = ?')
    params.push(note.trim())
  }

  if (setList.length > 0) {
    await pool.query(`UPDATE deliveries SET ${setList.join(', ')} WHERE id = ?`, [...params, req.params.id])
  }

  res.json({ message: '更新成功' })
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
