declare module '@vercel/node' {
  export interface VercelRequest {
    method?: string
    body?: unknown
    [key: string]: unknown
    [Symbol.asyncIterator](): AsyncIterator<Uint8Array | string>
  }

  export interface VercelResponse {
    status(code: number): VercelResponse
    json(body: unknown): void
    setHeader(name: string, value: string): void
  }
}

declare const process: {
  env: Record<string, string | undefined>
}
