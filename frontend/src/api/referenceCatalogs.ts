import { api } from './client'
import type { CostCategory, IncomeCategory } from './types'

export function listCostCategories() {
  return api.get<CostCategory[]>('/cost-categories').then((r) => r.data)
}
export function createCostCategory(payload: { name: string; is_active?: boolean }) {
  return api.post<CostCategory>('/cost-categories', payload).then((r) => r.data)
}
export function updateCostCategory(id: number, payload: Partial<{ name: string; is_active: boolean }>) {
  return api.patch<CostCategory>(`/cost-categories/${id}`, payload).then((r) => r.data)
}

export function listIncomeCategories() {
  return api.get<IncomeCategory[]>('/income-categories').then((r) => r.data)
}
export function createIncomeCategory(payload: { name: string; is_active?: boolean }) {
  return api.post<IncomeCategory>('/income-categories', payload).then((r) => r.data)
}
export function updateIncomeCategory(id: number, payload: Partial<{ name: string; is_active: boolean }>) {
  return api.patch<IncomeCategory>(`/income-categories/${id}`, payload).then((r) => r.data)
}
