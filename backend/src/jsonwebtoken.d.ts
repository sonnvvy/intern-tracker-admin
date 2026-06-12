declare module 'jsonwebtoken' {
  interface SignOptions {
    expiresIn?: string | number
  }

  interface JwtPayload {
    [key: string]: unknown
  }

  function sign(payload: string | object | Buffer, secretOrPrivateKey: string, options?: SignOptions): string
  function verify(token: string, secretOrPublicKey: string): string | JwtPayload

  const jwt: {
    sign: typeof sign
    verify: typeof verify
  }

  export default jwt
}
