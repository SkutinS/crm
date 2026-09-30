import type { UserRole } from '../api/types'

const LABELS: Record<UserRole, string> = {
  admin: 'администратор',
  senior_admin: 'старший администратор',
  employee: 'сотрудник',
}

export function roleLabel(role: UserRole, capitalize = false): string {
  const label = LABELS[role]
  return capitalize ? label.charAt(0).toUpperCase() + label.slice(1) : label
}
