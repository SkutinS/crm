import { api } from './client'
import type { RateType, User, UserRole } from './types'

export interface UserPayload {
  full_name: string
  login: string
  role: UserRole
  rate_type: RateType
  rate_amount: string
  is_active: boolean
  password?: string
}

export function listUsers() {
  return api.get<User[]>('/users').then((r) => r.data)
}

export function createUser(payload: UserPayload) {
  return api.post<User>('/users', payload).then((r) => r.data)
}

export function updateUser(id: number, payload: Partial<UserPayload>) {
  return api.patch<User>(`/users/${id}`, payload).then((r) => r.data)
}

export function deleteUser(id: number) {
  return api.delete(`/users/${id}`)
}
