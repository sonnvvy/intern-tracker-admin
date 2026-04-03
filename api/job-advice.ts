import type { VercelRequest, VercelResponse } from '@vercel/node'
import jobMatchHandler from './ai/job-match'

// Deprecated: use /api/ai/job-match instead.
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Deprecation', 'true')
  res.setHeader('Link', '</api/ai/job-match>; rel="successor-version"')
  await jobMatchHandler(req, res)
}
