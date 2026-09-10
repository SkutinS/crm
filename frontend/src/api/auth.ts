import { api } from './client'
import type { User } from './types'

export interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}

export function login(loginValue: string, password: string) {
  return api.post<TokenResponse>('/auth/login', { login: loginValue, password }).then((r) => r.data)
}

export function fetchMe() {
  return api.get<User>('/auth/me').then((r) => r.data)
}
