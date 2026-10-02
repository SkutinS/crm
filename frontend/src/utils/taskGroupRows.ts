import type { TaskGroupRef, TaskListItem } from '../api/types'

export interface TaskGroupRow {
  type: 'group'
  group: TaskGroupRef
  tasks: TaskListItem[]
}

export interface TaskRow {
  type: 'task'
  task: TaskListItem
}

export type TaskListRow = TaskGroupRow | TaskRow

/** Groups a flat, already-ordered task list into top-level rows: a task with
 * no group stays a plain row, a task with a group is folded into a single
 * group row (positioned where its first — i.e. most recent — task appears),
 * carrying the group's full task membership for the caller to render nested.
 */
export function buildTaskRows(tasks: TaskListItem[]): TaskListRow[] {
  const rows: TaskListRow[] = []
  const groupRows = new Map<number, TaskGroupRow>()

  for (const task of tasks) {
    if (task.group) {
      let groupRow = groupRows.get(task.group.id)
      if (!groupRow) {
        groupRow = { type: 'group', group: task.group, tasks: [] }
        groupRows.set(task.group.id, groupRow)
        rows.push(groupRow)
      }
      groupRow.tasks.push(task)
    } else {
      rows.push({ type: 'task', task })
    }
  }

  return rows
}
