import mysql from 'mysql2/promise'
import 'dotenv/config'

function getEnv(key: string, defaultValue: string): string {
  const value = process.env[key]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : defaultValue
}

export const pool = mysql.createPool({
  host: getEnv('MYSQL_HOST', 'localhost'),
  port: Number(getEnv('MYSQL_PORT', '3306')),
  user: getEnv('MYSQL_USER', 'root'),
  password: getEnv('MYSQL_PASSWORD', 'Sonnvvy123'),
  database: getEnv('MYSQL_DATABASE', 'intern_tracker'),
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true
})
