import type { VercelRequest, VercelResponse } from '@vercel/node'
import interviewChatHandler from './ai/interview-chat'

// Deprecated: use /api/ai/interview-chat instead.
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Deprecation', 'true')
  res.setHeader('Link', '</api/ai/interview-chat>; rel="successor-version"')
  await interviewChatHandler(req, res)
}
