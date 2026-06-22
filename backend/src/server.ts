import cors from 'cors'
import type { CorsOptions } from 'cors'
import express from 'express'
import jwt from 'jsonwebtoken'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import aiRouter from './routes/ai.js'
import { config } from './config.js'
import { pool } from './db.js'
import { HttpError } from './types.js'

interface AuthRequest extends express.Request {
  user?: {
    userId: number
    username: string
  }
}

const app = express()

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || config.frontendOrigins.includes(origin)) {
      callback(null, true)
      return
    }

    callback(new Error(`CORS origin is not allowed: ${origin}`))
  }
}

app.use(cors(corsOptions))
app.use(express.json({ limit: '2mb' }))
app.use('/ai', aiRouter)

const authMiddleware = (
  req: AuthRequest,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader) {
      return res.status(401).json({
        message: '未登录',
      })
    }

    const token = authHeader.replace('Bearer ', '')

    const decoded = jwt.verify(
      token,
      config.jwtSecret
    ) as {
      userId: number
      username: string
    }

    req.user = decoded

    next()
  } catch (error) {
    return res.status(401).json({
      message: '登录已失效',
    })
  }
}

app.get('/health', (_req: express.Request, res: express.Response) => {
  res.json({ status: 'ok' })
})

app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({
        message: '用户名和密码不能为空',
      })
    }

    const bcrypt = await import('bcryptjs')

    const hashedPassword = await bcrypt.hash(password, 10)

    const [rows] = await pool.query(
      'SELECT id FROM users WHERE username = ?',
      [username]
    )

    if ((rows as any[]).length > 0) {
      return res.status(400).json({
        message: '用户名已存在',
      })
    }

    const [result] = await pool.query(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword]
    )

    res.json({
      message: '注册成功',
      id: (result as any).insertId,
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: '注册失败',
    })
  }
})

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({
        message: '用户名和密码不能为空',
      })
    }

    const [rows] = await pool.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    )

    const users = rows as any[]

    if (users.length === 0) {
      return res.status(400).json({
        message: '用户不存在',
      })
    }

    const user = users[0]

    const bcrypt = await import('bcryptjs')

    const isValid = await bcrypt.compare(password, user.password)

    if (!isValid) {
      return res.status(400).json({
        message: '密码错误',
      })
    }

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
      },
      config.jwtSecret,
      {
        expiresIn: '7d',
      }
    )

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
      },
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: '登录失败',
    })
  }
})

app.get('/deliveries', authMiddleware, async (req: AuthRequest, res) => {
  const keyword = typeof req.query.keyword === 'string' ? req.query.keyword.trim() : ''
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : ''
  const page = Math.max(Number(req.query.page) || 1, 1)
  const pageSize = Math.max(Number(req.query.pageSize) || 10, 1)
  const offset = (page - 1) * pageSize
  const whereList: string[] = ['user_id = ?']
  const params: Array<string | number> = [req.user!.userId]

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

app.post('/deliveries', authMiddleware, async (req: AuthRequest, res) => {
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
    `INSERT INTO deliveries (company, position, status, city, channel, apply_date, note, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      company.trim(),
      position.trim(),
      status,
      city?.trim() || null,
      channel?.trim() || null,
      apply_date || null,
      note?.trim() || null,
      req.user!.userId
    ]
  )

  res.json({ message: '新增成功', id: result.insertId })
})

app.delete('/deliveries/:id', authMiddleware, async (req: AuthRequest, res) => {
  await pool.query('DELETE FROM deliveries WHERE id = ? AND user_id = ?', [req.params.id, req.user!.userId])
  res.json({ message: '删除成功' })
})

app.put('/deliveries/:id', authMiddleware, async (req: AuthRequest, res) => {
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
    await pool.query(`UPDATE deliveries SET ${setList.join(', ')} WHERE id = ? AND user_id = ?`, [
      ...params,
      req.params.id,
      req.user!.userId
    ])
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
