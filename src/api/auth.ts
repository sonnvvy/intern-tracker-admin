import http from '@/api/http'

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  message: string
  token: string
  user: {
    id: number
    username: string
  }
}

export interface RegisterRequest {
  username: string
  password: string
}

export interface RegisterResponse {
  message: string
  id: number
}

export async function login(req: LoginRequest): Promise<LoginResponse> {
  const { data } = await http.post<LoginResponse>('/login', req)
  return data
}

export async function register(req: RegisterRequest): Promise<RegisterResponse> {
  const { data } = await http.post<RegisterResponse>('/register', req)
  return data
}
