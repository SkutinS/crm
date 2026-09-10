import { api } from './client'
import type { PartCatalogItem, ServiceCatalogItem } from './types'

export function listServiceCatalog() {
  return api.get<ServiceCatalogItem[]>('/catalog/services').then((r) => r.data)
}
export function createServiceCatalogItem(payload: { parent_id: number | null; name: string; default_price: string | null }) {
  return api.post<ServiceCatalogItem>('/catalog/services', payload).then((r) => r.data)
}
export function updateServiceCatalogItem(
  id: number,
  payload: Partial<{ parent_id: number | null; name: string; default_price: string | null }>,
) {
  return api.patch<ServiceCatalogItem>(`/catalog/services/${id}`, payload).then((r) => r.data)
}
export function deleteServiceCatalogItem(id: number) {
  return api.delete(`/catalog/services/${id}`)
}

export function listPartCatalog() {
  return api.get<PartCatalogItem[]>('/catalog/parts').then((r) => r.data)
}
export function createPartCatalogItem(payload: {
  parent_id: number | null
  name: string
  default_sale_price: string | null
  default_purchase_price: string | null
}) {
  return api.post<PartCatalogItem>('/catalog/parts', payload).then((r) => r.data)
}
export function updatePartCatalogItem(
  id: number,
  payload: Partial<{ parent_id: number | null; name: string; default_sale_price: string | null; default_purchase_price: string | null }>,
) {
  return api.patch<PartCatalogItem>(`/catalog/parts/${id}`, payload).then((r) => r.data)
}
export function deletePartCatalogItem(id: number) {
  return api.delete(`/catalog/parts/${id}`)
}
