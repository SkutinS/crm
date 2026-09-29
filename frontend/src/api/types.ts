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
  can_access_cash: boolean
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
  document_date: string | null
}

export interface CostCategory {
  id: number
  name: string
  is_active: boolean
}

export interface IncomeCategory {
  id: number
  name: string
  is_active: boolean
}

export interface MoneyItem {
  id: number
  task_id: number
  description: string
  amount: string
  category_id: number | null
  category: { id: number; name: string; is_active: boolean } | null
  document_date: string | null
}

export interface Participation {
  id: number
  task_id: number
  user_id: number
  hours: string | null
  amount: string
  paid_at: string | null
  comment: string | null
  cost_category_id: number | null
  cost_category: { id: number; name: string; is_active: boolean } | null
  user: User
}

export interface TaskListItem {
  id: number
  title: string
  created_at: string
  client: Client
  stage: TaskStage
  assignments: TaskAssignment[]
  invoice_total: string
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
  default_salary_cost_category_id: number | null
}

export type CashDocumentType = 'income' | 'expense'

export interface CashDocument {
  id: number
  register_id: number
  doc_type: CashDocumentType
  amount: string
  document_date: string
  description: string | null
  cost_category_id: number | null
  income_category_id: number | null
  created_at: string
}

export interface CashJournalEntry {
  source: 'cash_document' | 'task_expense' | 'task_income' | 'task_participation' | 'task_part_purchase'
  source_id: number
  doc_type: CashDocumentType
  amount: string
  document_date: string | null
  description: string | null
  category_name: string | null
  cost_category_id: number | null
  income_category_id: number | null
  task: { id: number; title: string } | null
}

export interface CashSummary {
  balance: string
  entries: CashJournalEntry[]
}
