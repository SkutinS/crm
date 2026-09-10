export type UserRole = 'admin' | 'employee'
export type RateType = 'hourly' | 'fixed'
export type WorkStatus = 'planned' | 'done'
export type TaskParticipantRole = 'executor' | 'controller'

export interface User {
  id: number
  full_name: string
  login: string
  role: UserRole
  rate_type: RateType
  rate_amount: string
  is_active: boolean
  created_at: string
}

export interface Client {
  id: number
  name: string
  phone: string | null
  email: string | null
  address: string | null
  comment: string | null
  created_at: string
}

export interface TaskStage {
  id: number
  code: string
  name: string
  order: number
}

export interface TaskAssignment {
  id: number
  user_id: number
  role_in_task: TaskParticipantRole
  user: User
}

export interface Work {
  id: number
  task_id: number
  catalog_item_id: number | null
  description: string
  service_price: string
  planned_start: string
  planned_end: string
  status: WorkStatus
  assignee_id: number | null
}

export interface Part {
  id: number
  task_id: number
  catalog_item_id: number | null
  name: string
  quantity: string
  price_per_unit: string
  purchase_price: string
  amount: string
  margin: string
}

export interface MoneyItem {
  id: number
  task_id: number
  description: string
  amount: string
}

export interface Participation {
  id: number
  task_id: number
  user_id: number
  hours: string | null
  amount: string
  user: User
}

export interface TaskListItem {
  id: number
  title: string
  created_at: string
  client: Client
  stage: TaskStage
  assignments: TaskAssignment[]
}

export interface TaskDetail {
  id: number
  title: string
  description: string | null
  created_at: string
  client: Client
  stage: TaskStage
  assignments: TaskAssignment[]
  works: Work[]
  parts: Part[]
  expenses: MoneyItem[]
  incomes: MoneyItem[]
  participations: Participation[]
  invoice_total: string
  debt: string
  profit: string
}

export interface CalendarWorkItem {
  id: number
  description: string
  planned_start: string
  planned_end: string
  status: WorkStatus
  assignee_id: number | null
  assignee_name: string | null
  task: { id: number; title: string }
  has_conflict: boolean
}

export interface ServiceCatalogItem {
  id: number
  parent_id: number | null
  name: string
  default_price: string | null
}

export interface PartCatalogItem {
  id: number
  parent_id: number | null
  name: string
  default_sale_price: string | null
  default_purchase_price: string | null
}

export interface SystemSettings {
  currency_code: string
  currency_symbol: string
}
