import { api } from './client'
import type { CashDocumentType, CashSummary, CashDocument } from './types'

export interface CashDocumentPayload {
  doc_type: CashDocumentType
  amount: string
  document_date?: string
  description?: string | null
  cost_category_id?: number | null
  income_category_id?: number | null
}

export function getCashSummary() {
  return api.get<CashSummary>('/cash').then((r) => r.data)
}

export function createCashDocument(payload: CashDocumentPayload) {
  return api.post<CashDocument>('/cash/documents', payload).then((r) => r.data)
}

export function updateCashDocument(id: number, payload: Partial<CashDocumentPayload>) {
  return api.patch<CashDocument>(`/cash/documents/${id}`, payload).then((r) => r.data)
}

export function deleteCashDocument(id: number) {
  return api.delete(`/cash/documents/${id}`)
}
