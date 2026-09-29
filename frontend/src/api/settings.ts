import { api } from './client'
import type { SystemSettings } from './types'

export const SUPPORTED_CURRENCIES: { code: string; symbol: string; label: string }[] = [
  { code: 'RUB', symbol: '₽', label: 'Российский рубль (₽)' },
  { code: 'USD', symbol: '$', label: 'Доллар США ($)' },
  { code: 'EUR', symbol: '€', label: 'Евро (€)' },
  { code: 'KZT', symbol: '₸', label: 'Тенге (₸)' },
  { code: 'BYN', symbol: 'Br', label: 'Белорусский рубль (Br)' },
  { code: 'UAH', symbol: '₴', label: 'Гривна (₴)' },
]

export function getSettings() {
  return api.get<SystemSettings>('/settings').then((r) => r.data)
}

export function updateSettings(
  payload: Partial<{ currency_code: string; default_salary_cost_category_id: number | null }>,
) {
  return api.patch<SystemSettings>('/settings', payload).then((r) => r.data)
}
