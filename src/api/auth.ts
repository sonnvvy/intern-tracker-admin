import { supabase } from '@/api/supabase'

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  password: string
}

export async function login(req: LoginRequest) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: req.username,
    password: req.password
  })

  if (error) {
    throw error
  }

  return data
}

export async function register(req: RegisterRequest) {
  const { data, error } = await supabase.auth.signUp({
    email: req.username,
    password: req.password
  })

  if (error) {
    throw error
  }

  return data
}

export async function logout() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}
