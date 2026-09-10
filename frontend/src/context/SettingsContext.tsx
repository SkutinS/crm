import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getSettings } from '../api/settings'
import type { SystemSettings } from '../api/types'
import { useAuth } from './AuthContext'

interface SettingsContextValue {
  settings: SystemSettings
  refresh: () => void
  formatMoney: (value: string | number) => string
}

const DEFAULT_SETTINGS: SystemSettings = { currency_code: 'RUB', currency_symbol: '₽' }

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS)

  function refresh() {
    if (!user) return
    getSettings()
      .then(setSettings)
      .catch(() => {})
  }

  useEffect(refresh, [user])

  function formatMoney(value: string | number): string {
    const num = Number(value)
    return `${num.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${settings.currency_symbol}`
  }

  return <SettingsContext.Provider value={{ settings, refresh, formatMoney }}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
