// Calendar-date fields (document_date, paid_at, ...) are plain "YYYY-MM-DD"
// values with no time component. Using Date.toISOString()/`new Date(str)`
// for these would shift the date by the viewer's UTC offset (e.g.
// Sep 22 00:00 MSK -> "2026-09-21" after toISOString().slice(0, 10)), so
// conversion is done from local Date fields instead, never through UTC.

export function toDateOnly(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatDateOnly(s: string | null): string {
  if (!s) return '—'
  const [y, m, d] = s.split('-')
  return `${d}.${m}.${y}`
}
