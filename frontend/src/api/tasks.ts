import { api } from './client'
import type {
  MoneyItem,
  Part,
  Participation,
  TaskAssignment,
  TaskDetail,
  TaskListItem,
  TaskParticipantRole,
  Work,
  WorkStatus,
} from './types'

export interface TaskFilters {
  client_id?: number
  stage_id?: number
}

export function listTasks(filters: TaskFilters = {}) {
  return api.get<TaskListItem[]>('/tasks', { params: filters }).then((r) => r.data)
}

export function getTask(id: number) {
  return api.get<TaskDetail>(`/tasks/${id}`).then((r) => r.data)
}

export interface TaskCreatePayload {
  client_id: number
  title: string
  description?: string | null
  stage_id?: number
  assignments?: { user_id: number; role_in_task: TaskParticipantRole }[]
}

export function createTask(payload: TaskCreatePayload) {
  return api.post<TaskDetail>('/tasks', payload).then((r) => r.data)
}

export function updateTask(
  id: number,
  payload: Partial<{ client_id: number; title: string; description: string | null }>,
) {
  return api.patch<TaskDetail>(`/tasks/${id}`, payload).then((r) => r.data)
}

export function changeTaskStage(id: number, stage_id: number) {
  return api.patch<TaskDetail>(`/tasks/${id}/stage`, { stage_id }).then((r) => r.data)
}

export function deleteTask(id: number) {
  return api.delete(`/tasks/${id}`)
}

export function addAssignment(taskId: number, user_id: number, role_in_task: TaskParticipantRole) {
  return api
    .post<TaskAssignment>(`/tasks/${taskId}/assignments`, { user_id, role_in_task })
    .then((r) => r.data)
}

export function removeAssignment(taskId: number, assignmentId: number) {
  return api.delete(`/tasks/${taskId}/assignments/${assignmentId}`)
}

// ---- Works ----

export interface WorkPayload {
  catalog_item_id: number | null
  description: string
  service_price: string
  planned_start: string
  planned_end: string
  status: WorkStatus
  assignee_id: number | null
}

export function addWork(taskId: number, payload: WorkPayload) {
  return api.post<Work>(`/tasks/${taskId}/works`, payload).then((r) => r.data)
}

export function updateWork(taskId: number, workId: number, payload: Partial<WorkPayload>) {
  return api.patch<Work>(`/tasks/${taskId}/works/${workId}`, payload).then((r) => r.data)
}

export function deleteWork(taskId: number, workId: number) {
  return api.delete(`/tasks/${taskId}/works/${workId}`)
}

// ---- Parts ----

export interface PartPayload {
  catalog_item_id: number | null
  name: string
  quantity: string
  price_per_unit: string
  purchase_price: string
}

export function addPart(taskId: number, payload: PartPayload) {
  return api.post<Part>(`/tasks/${taskId}/parts`, payload).then((r) => r.data)
}

export function updatePart(taskId: number, partId: number, payload: Partial<PartPayload>) {
  return api.patch<Part>(`/tasks/${taskId}/parts/${partId}`, payload).then((r) => r.data)
}

export function deletePart(taskId: number, partId: number) {
  return api.delete(`/tasks/${taskId}/parts/${partId}`)
}

// ---- Expenses / incomes (same shape) ----

export interface MoneyItemPayload {
  description: string
  amount: string
}

export function addExpense(taskId: number, payload: MoneyItemPayload) {
  return api.post<MoneyItem>(`/tasks/${taskId}/expenses`, payload).then((r) => r.data)
}
export function updateExpense(taskId: number, id: number, payload: Partial<MoneyItemPayload>) {
  return api.patch<MoneyItem>(`/tasks/${taskId}/expenses/${id}`, payload).then((r) => r.data)
}
export function deleteExpense(taskId: number, id: number) {
  return api.delete(`/tasks/${taskId}/expenses/${id}`)
}

export function addIncome(taskId: number, payload: MoneyItemPayload) {
  return api.post<MoneyItem>(`/tasks/${taskId}/incomes`, payload).then((r) => r.data)
}
export function updateIncome(taskId: number, id: number, payload: Partial<MoneyItemPayload>) {
  return api.patch<MoneyItem>(`/tasks/${taskId}/incomes/${id}`, payload).then((r) => r.data)
}
export function deleteIncome(taskId: number, id: number) {
  return api.delete(`/tasks/${taskId}/incomes/${id}`)
}

// ---- Participations ----

export function suggestParticipation(taskId: number, userId: number) {
  return api
    .get<{ hours: string | null; amount: string }>(`/tasks/${taskId}/participations/suggest`, {
      params: { user_id: userId },
    })
    .then((r) => r.data)
}

export function addParticipation(taskId: number, user_id: number, hours: string | null, amount: string | null) {
  return api
    .post<Participation>(`/tasks/${taskId}/participations`, { user_id, hours, amount })
    .then((r) => r.data)
}

export function updateParticipation(
  taskId: number,
  id: number,
  payload: Partial<{ hours: string | null; amount: string }>,
) {
  return api.patch<Participation>(`/tasks/${taskId}/participations/${id}`, payload).then((r) => r.data)
}

export function deleteParticipation(taskId: number, id: number) {
  return api.delete(`/tasks/${taskId}/participations/${id}`)
}
