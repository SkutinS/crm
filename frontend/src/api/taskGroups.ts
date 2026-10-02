import { api } from './client'
import type { TaskGroupDetail, TaskGroupListItem } from './types'

export function listTaskGroups() {
  return api.get<TaskGroupListItem[]>('/task-groups').then((r) => r.data)
}

export function createTaskGroup(name: string) {
  return api.post<TaskGroupListItem>('/task-groups', { name }).then((r) => r.data)
}

export function renameTaskGroup(id: number, name: string) {
  return api.patch<TaskGroupListItem>(`/task-groups/${id}`, { name }).then((r) => r.data)
}

export function deleteTaskGroup(id: number) {
  return api.delete(`/task-groups/${id}`)
}

export function getTaskGroup(id: number) {
  return api.get<TaskGroupDetail>(`/task-groups/${id}`).then((r) => r.data)
}

export function addTasksToGroup(groupId: number, taskIds: number[]) {
  return api.post<TaskGroupDetail>(`/task-groups/${groupId}/tasks`, { task_ids: taskIds }).then((r) => r.data)
}

export function removeTaskFromGroup(groupId: number, taskId: number) {
  return api.delete<TaskGroupDetail>(`/task-groups/${groupId}/tasks/${taskId}`).then((r) => r.data)
}
