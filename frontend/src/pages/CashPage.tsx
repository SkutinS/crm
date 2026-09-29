import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Modal,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  Title,
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { IconEdit, IconPlus, IconTrash } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiErrorMessage } from '../api/client'
import {
  createCashDocument,
  deleteCashDocument,
  getCashSummary,
  updateCashDocument,
  type CashDocumentPayload,
} from '../api/cash'
import { createCostCategory, createIncomeCategory, listCostCategories, listIncomeCategories } from '../api/referenceCatalogs'
import type { CashDocumentType, CashJournalEntry, CostCategory, IncomeCategory } from '../api/types'
import { CreatableSelect } from '../components/CreatableSelect'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { categoryOptions } from '../utils/categoryOptions'
import { formatDateOnly, parseDateOnly, toDateOnly } from '../utils/dateOnly'
import { selectOnFocus } from '../utils/selectOnFocus'

interface FormValues {
  id: number | null
  doc_type: CashDocumentType
  amount: number
  document_date: Date
  description: string
  category_id: string
}

const EMPTY: FormValues = {
  id: null,
  doc_type: 'income',
  amount: 0,
  document_date: new Date(),
  description: '',
  category_id: '',
}

export function CashPage() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { formatMoney } = useSettings()

  const [balance, setBalance] = useState<string>('0')
  const [entries, setEntries] = useState<CashJournalEntry[]>([])
  const [costCategories, setCostCategories] = useState<CostCategory[]>([])
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [opened, { open, close }] = useDisclosure(false)

  const form = useForm<FormValues>({ initialValues: EMPTY })

  function refresh() {
    return getCashSummary().then((s) => {
      setBalance(s.balance)
      setEntries(s.entries)
    })
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([refresh(), listCostCategories().then(setCostCategories), listIncomeCategories().then(setIncomeCategories)]).finally(
      () => setLoading(false),
    )
  }, [])

  function openCreate() {
    form.setValues(EMPTY)
    open()
  }

  function openEdit(entry: CashJournalEntry) {
    form.setValues({
      id: entry.source_id,
      doc_type: entry.doc_type,
      amount: Number(entry.amount),
      document_date: entry.document_date ? parseDateOnly(entry.document_date) : new Date(),
      description: entry.description ?? '',
      category_id: String(entry.cost_category_id ?? entry.income_category_id ?? ''),
    })
    open()
  }

  async function handleSubmit(values: FormValues) {
    const payload: CashDocumentPayload = {
      doc_type: values.doc_type,
      amount: String(values.amount),
      document_date: toDateOnly(values.document_date),
      description: values.description || null,
      cost_category_id: values.doc_type === 'expense' ? Number(values.category_id) : null,
      income_category_id: values.doc_type === 'income' ? Number(values.category_id) : null,
    }
    try {
      if (values.id !== null) await updateCashDocument(values.id, payload)
      else await createCashDocument(payload)
      close()
      await refresh()
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось сохранить документ') })
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Удалить кассовый документ?')) return
    try {
      await deleteCashDocument(id)
      await refresh()
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось удалить документ') })
    }
  }

  if (loading) {
    return (
      <Center h={300}>
        <Loader />
      </Center>
    )
  }

  const categoryData = categoryOptions(form.values.doc_type === 'expense' ? costCategories : incomeCategories, null)

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Касса</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
          Добавить документ
        </Button>
      </Group>

      <Card shadow="sm" radius="md" w={280}>
        <Text size="sm" c="dimmed">
          Текущий остаток
        </Text>
        <Text fw={700} size="xl" c={Number(balance) >= 0 ? 'teal' : 'red'}>
          {formatMoney(balance)}
        </Text>
      </Card>

      <Table verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Дата</Table.Th>
            <Table.Th>Тип</Table.Th>
            <Table.Th>Сумма</Table.Th>
            <Table.Th>Статья</Table.Th>
            <Table.Th>Описание</Table.Th>
            <Table.Th>Источник</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {entries.map((e) => (
            <Table.Tr key={`${e.source}-${e.source_id}`}>
              <Table.Td>{formatDateOnly(e.document_date)}</Table.Td>
              <Table.Td>
                <Badge color={e.doc_type === 'income' ? 'teal' : 'red'} variant="light">
                  {e.doc_type === 'income' ? 'приход' : 'расход'}
                </Badge>
              </Table.Td>
              <Table.Td>{formatMoney(e.amount)}</Table.Td>
              <Table.Td>{e.category_name ?? '—'}</Table.Td>
              <Table.Td>{e.description ?? '—'}</Table.Td>
              <Table.Td>
                {e.task ? (
                  <Badge
                    variant="light"
                    color="gray"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/tasks/${e.task!.id}`)}
                  >
                    Задача: {e.task.title}
                  </Badge>
                ) : (
                  <Badge variant="light" color="blue">
                    Касса
                  </Badge>
                )}
              </Table.Td>
              <Table.Td>
                {e.source === 'cash_document' && (
                  <Group gap="xs" justify="flex-end">
                    <ActionIcon variant="subtle" onClick={() => openEdit(e)}>
                      <IconEdit size={14} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(e.source_id)}>
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                )}
              </Table.Td>
            </Table.Tr>
          ))}
          {entries.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={7}>
                <Text c="dimmed" size="sm" ta="center" py="sm">
                  Операций пока нет
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>

      <Modal opened={opened} onClose={close} title={form.values.id !== null ? 'Редактировать документ' : 'Новый кассовый документ'}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <Select
              label="Тип"
              data={[
                { value: 'income', label: 'Приход' },
                { value: 'expense', label: 'Расход' },
              ]}
              allowDeselect={false}
              disabled={form.values.id !== null}
              value={form.values.doc_type}
              onChange={(v) => {
                if (!v) return
                form.setFieldValue('doc_type', v as CashDocumentType)
                form.setFieldValue('category_id', '')
              }}
            />
            <NumberInput
              label="Сумма"
              min={0}
              decimalScale={2}
              required
              onFocus={selectOnFocus}
              {...form.getInputProps('amount')}
            />
            <CreatableSelect
              label={form.values.doc_type === 'income' ? 'Статья дохода' : 'Статья затрат'}
              placeholder="Выберите статью"
              required
              data={categoryData}
              canCreate={isAdmin}
              onCreate={async (name) => {
                if (form.values.doc_type === 'income') {
                  const c = await createIncomeCategory({ name })
                  return { option: { value: String(c.id), label: c.name }, record: c }
                }
                const c = await createCostCategory({ name })
                return { option: { value: String(c.id), label: c.name }, record: c }
              }}
              onCreated={(c) => {
                if (form.values.doc_type === 'income') setIncomeCategories((prev) => [...prev, c as IncomeCategory])
                else setCostCategories((prev) => [...prev, c as CostCategory])
              }}
              {...form.getInputProps('category_id')}
            />
            <DateInput label="Дата" required valueFormat="DD.MM.YYYY" {...form.getInputProps('document_date')} />
            <Textarea label="Описание" {...form.getInputProps('description')} />
            <Button type="submit">Сохранить</Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  )
}
