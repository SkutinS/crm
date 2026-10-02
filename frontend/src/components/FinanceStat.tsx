import { Text } from '@mantine/core'

export function FinanceStat({
  label,
  value,
  formatMoney,
  color,
}: {
  label: string
  value: string
  formatMoney: (v: string) => string
  color?: string
}) {
  return (
    <div>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={700} c={color}>
        {formatMoney(value)}
      </Text>
    </div>
  )
}
