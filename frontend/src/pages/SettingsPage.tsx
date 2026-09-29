import { Button, Card, Group, Select, SegmentedControl, Stack, Text, Title, useMantineColorScheme } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useEffect, useState } from 'react'
import { apiErrorMessage } from '../api/client'
import { createCostCategory, listCostCategories } from '../api/referenceCatalogs'
import { SUPPORTED_CURRENCIES, updateSettings } from '../api/settings'
import type { CostCategory } from '../api/types'
import { CreatableSelect } from '../components/CreatableSelect'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { categoryOptions } from '../utils/categoryOptions'

export function SettingsPage() {
  const { isAdmin } = useAuth()
  const { settings, refresh } = useSettings()
  const { colorScheme, setColorScheme } = useMantineColorScheme()
  const [currencyCode, setCurrencyCode] = useState(settings.currency_code)
  const [savingCurrency, setSavingCurrency] = useState(false)

  const [costCategories, setCostCategories] = useState<CostCategory[]>([])
  const [salaryCategoryId, setSalaryCategoryId] = useState<string | null>(
    settings.default_salary_cost_category_id ? String(settings.default_salary_cost_category_id) : null,
  )
  const [savingSalaryCategory, setSavingSalaryCategory] = useState(false)

  useEffect(() => {
    if (isAdmin) listCostCategories().then(setCostCategories)
  }, [isAdmin])

  useEffect(() => {
    setSalaryCategoryId(settings.default_salary_cost_category_id ? String(settings.default_salary_cost_category_id) : null)
  }, [settings.default_salary_cost_category_id])

  async function handleSaveCurrency() {
    setSavingCurrency(true)
    try {
      await updateSettings({ currency_code: currencyCode })
      refresh()
      notifications.show({ color: 'green', message: 'Валюта сохранена' })
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось сохранить валюту') })
    } finally {
      setSavingCurrency(false)
    }
  }

  async function handleSaveSalaryCategory() {
    setSavingSalaryCategory(true)
    try {
      await updateSettings({
        default_salary_cost_category_id: salaryCategoryId ? Number(salaryCategoryId) : null,
      })
      refresh()
      notifications.show({ color: 'green', message: 'Статья по умолчанию сохранена' })
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось сохранить статью') })
    } finally {
      setSavingSalaryCategory(false)
    }
  }

  const salaryCategoryChanged =
    salaryCategoryId !== (settings.default_salary_cost_category_id ? String(settings.default_salary_cost_category_id) : null)

  return (
    <Stack maw={480}>
      <Title order={2}>Настройки</Title>

      <Card shadow="sm" radius="md">
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

      <Card shadow="sm" radius="md">
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
            <Button onClick={handleSaveCurrency} loading={savingCurrency} disabled={currencyCode === settings.currency_code}>
              Сохранить
            </Button>
          </Group>
        ) : (
          <Text>{SUPPORTED_CURRENCIES.find((c) => c.code === settings.currency_code)?.label ?? settings.currency_code}</Text>
        )}
      </Card>

      {isAdmin && (
        <Card shadow="sm" radius="md">
          <Text fw={600} mb="xs">
            Статья затрат по умолчанию для зарплаты
          </Text>
          <Text size="sm" c="dimmed" mb="sm">
            Подставляется в новую запись «Зарплата по задаче» автоматически, но остаётся редактируемой для каждой
            записи — смена этой настройки не меняет уже сохранённые записи.
          </Text>
          <Group align="flex-end">
            <CreatableSelect
              placeholder="Не задана"
              data={categoryOptions(costCategories, settings.default_salary_cost_category_id)}
              value={salaryCategoryId}
              onChange={setSalaryCategoryId}
              clearable
              searchable
              w={280}
              canCreate={isAdmin}
              onCreate={async (name) => {
                const c = await createCostCategory({ name })
                return { option: { value: String(c.id), label: c.name }, record: c }
              }}
              onCreated={(c) => setCostCategories((prev) => [...prev, c])}
            />
            <Button onClick={handleSaveSalaryCategory} loading={savingSalaryCategory} disabled={!salaryCategoryChanged}>
              Сохранить
            </Button>
          </Group>
        </Card>
      )}
    </Stack>
  )
}
