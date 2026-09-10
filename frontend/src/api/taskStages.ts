import { api } from './client'
import type { TaskStage } from './types'

export function listTaskStages() {
  return api.get<TaskStage[]>('/task-stages').then((r) => r.data)
}
