import { api } from './client'
import type { CalendarWorkItem } from './types'

export interface CalendarQuery {
  start?: string
  end?: string
  employee_id?: number
}

export function listCalendarWorks(query: CalendarQuery) {
  return api.get<CalendarWorkItem[]>('/calendar/works', { params: query }).then((r) => r.data)
}
