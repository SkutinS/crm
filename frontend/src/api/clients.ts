import { api } from './client'
import type { Client } from './types'

export interface ClientPayload {
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  comment?: string | null
}

export function listClients() {
  return api.get<Client[]>('/clients').then((r) => r.data)
}

export function createClient(payload: ClientPayload) {
  return api.post<Client>('/clients', payload).then((r) => r.data)
}

export function updateClient(id: number, payload: Partial<ClientPayload>) {
  return api.patch<Client>(`/clients/${id}`, payload).then((r) => r.data)
}

export function deleteClient(id: number) {
  return api.delete(`/clients/${id}`)
}
