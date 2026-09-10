import { Badge } from '@mantine/core'
import type { TaskStage } from '../api/types'

const STAGE_COLORS: Record<string, string> = {
  new: 'gray',
  approval: 'yellow',
  in_progress: 'blue',
  done: 'teal',
  closed_paid: 'green',
}

export function StageBadge({ stage }: { stage: TaskStage }) {
  return (
    <Badge color={STAGE_COLORS[stage.code] ?? 'gray'} variant="light">
      {stage.name}
    </Badge>
  )
}
