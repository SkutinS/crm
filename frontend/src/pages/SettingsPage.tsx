import { Button, Card, Group, Select, SegmentedControl, Stack, Text, Title, useMantineColorScheme } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useState } from 'react'
import { apiErrorMessage } from '../api/client'
import { SUPPORTED_CURRENCIES, updateSettings } from '../api/settings'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'

export function SettingsPage() {
  const { isAdmin } = useAuth()
  const { settings, refresh } = useSettings()
  const { colorScheme, setColorScheme } = useMantineColorScheme()
  const [currencyCode, setCurrencyCode] = useState(settings.currency_code)
  const [saving, setSaving] = useState(false)

  async function handleSaveCurrency() {
    setSaving(true)
    try {
      await updateSettings(currencyCode)
      refresh()
      notifications.show({ color: 'green', message: 'Валюта сохранена' })
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось сохранить валюту') })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Stack maw={480}>
      <Title order={2}>Настройки</Title>

      <Card withBorder>
        <Text fw={600} mb="xs">
          Оформление
        </Text>
        <Text size="sm" c="dimmed" mb="sm">
          Применяется только в этом браузере.
        </Text>
        <SegmentedControl
          value={colorScheme === 'auto' ? 'auto' : colorScheme}
          onChange={(v) => setColorScheme(v as 'light' | 'dark' | 'auto')}
          data={[
            { label: 'Светлая', value: 'light' },
            { label: 'Тёмная', value: 'dark' },
            { label: 'Как в системе', value: 'auto' },
          ]}
        />
      </Card>

      <Card withBorder>
        <Text fw={600} mb="xs">
          Валюта учёта
        </Text>
        <Text size="sm" c="dimmed" mb="sm">
          Общая для всей системы — используется во всех суммах.
        </Text>
        {isAdmin ? (
          <Group align="flex-end">
            <Select
              data={SUPPORTED_CURRENCIES.map((c) => ({ value: c.code, label: c.label }))}
              value={currencyCode}
              onChange={(v) => v && setCurrencyCode(v)}
              allowDeselect={false}
              w={280}
            />
            <Button onClick={handleSaveCurrency} loading={saving} disabled={currencyCode === settings.currency_code}>
              Сохранить
            </Button>
          </Group>
        ) : (
          <Text>{SUPPORTED_CURRENCIES.find((c) => c.code === settings.currency_code)?.label ?? settings.currency_code}</Text>
        )}
      </Card>
    </Stack>
  )
}
