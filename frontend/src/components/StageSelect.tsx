import { Select } from '@mantine/core'
import type { TaskStage } from '../api/types'

export function StageSelect({
  stages,
  value,
  onChange,
  disabled,
}: {
  stages: TaskStage[]
  value: number
  onChange: (stageId: number) => void
  disabled?: boolean
}) {
  return (
    <Select
      data={stages.map((s) => ({ value: String(s.id), label: s.name }))}
      value={String(value)}
      onChange={(v) => v && onChange(Number(v))}
      disabled={disabled}
      allowDeselect={false}
      w={180}
    />
  )
}
