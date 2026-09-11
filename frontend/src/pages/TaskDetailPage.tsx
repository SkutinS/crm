import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Collapse,
  Group,
  Loader,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
  Center,
} from '@mantine/core'
import { DateTimePicker } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { IconChevronDown, IconChevronUp, IconEdit, IconPlus, IconTrash } from '@tabler/icons-react'
import { useEffect, useState, type FocusEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiErrorMessage } from '../api/client'
import { listPartCatalog, listServiceCatalog } from '../api/catalog'
import { listTaskStages } from '../api/taskStages'
import {
  addAssignment,
  addExpense,
  addIncome,
  addParticipation,
  addPart,
  addWork,
  changeTaskStage,
  deleteExpense,
  deleteIncome,
  deleteParticipation,
  deletePart,
  deleteTask,
  deleteWork,
  getTask,
  removeAssignment,
  suggestParticipation,
  updateExpense,
  updateIncome,
  updateParticipation,
  updatePart,
  updateTask,
  updateWork,
  type PartPayload,
  type WorkPayload,
} from '../api/tasks'
import type {
  MoneyItem,
  Part,
  PartCatalogItem,
  Participation,
  ServiceCatalogItem,
  TaskDetail,
  TaskStage,
  User,
  Work,
} from '../api/types'
import { listUsers } from '../api/users'
import { CatalogPicker } from '../components/CatalogPicker'
import { StageSelect } from '../components/StageSelect'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'

// Mantine's NumberInput keeps the initial 0 in place and inserts typed
// digits next to it instead of replacing it. Selecting the whole value on
// focus makes the first keystroke overwrite it, like a normal spreadsheet
// cell.
function selectOnFocus(e: FocusEvent<HTMLInputElement>) {
  e.currentTarget.select()
}

// ---- Inline-editable table cells (Works/Parts rows are edited directly in
// the table instead of through a separate form) ----

function InlineTextCell({
  value,
  onCommit,
  width,
  size = 'xs',
  fw,
}: {
  value: string
  onCommit: (value: string) => void
  width?: number
  size?: string
  fw?: number
}) {
  const [local, setLocal] = useState(value)
  useEffect(() => setLocal(value), [value])

  return (
    <TextInput
      size={size}
      fw={fw}
      w={width}
      value={local}
      onChange={(e) => setLocal(e.currentTarget.value)}
      onBlur={() => {
        const next = local.trim()
        if (!next) {
          setLocal(value)
          return
        }
        if (next !== value) onCommit(next)
        else setLocal(next)
      }}
    />
  )
}

function InlineNumberCell({
  value,
  onCommit,
  decimalScale = 2,
  width = 110,
}: {
  value: number
  onCommit: (value: number) => void
  decimalScale?: number
  width?: number
}) {
  const [local, setLocal] = useState<number | ''>(value)
  useEffect(() => setLocal(value), [value])

  return (
    <NumberInput
      size="xs"
      w={width}
      hideControls
      min={0}
      decimalScale={decimalScale}
      value={local}
      onChange={(v) => setLocal(v === '' ? '' : Number(v))}
      onFocus={selectOnFocus}
      onBlur={() => {
        const next = local === '' ? 0 : local
        if (next !== value) onCommit(next)
      }}
    />
  )
}

function FinanceStat({
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

export function TaskDetailPage() {
  const { id } = useParams()
  const taskId = Number(id)
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { formatMoney } = useSettings()

  const [task, setTask] = useState<TaskDetail | null>(null)
  const [stages, setStages] = useState<TaskStage[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [serviceCatalog, setServiceCatalog] = useState<ServiceCatalogItem[]>([])
  const [partCatalog, setPartCatalog] = useState<PartCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [financeOpened, { toggle: toggleFinance }] = useDisclosure(false)

  function refresh() {
    return getTask(taskId).then(setTask)
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([
      refresh(),
      listTaskStages().then(setStages),
      listUsers().then(setUsers),
      listServiceCatalog().then(setServiceCatalog),
      listPartCatalog().then(setPartCatalog),
    ]).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId])

  async function handleStageChange(stageId: number) {
    try {
      const updated = await changeTaskStage(taskId, stageId)
      setTask(updated)
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось сменить этап') })
    }
  }

  async function handleDeleteTask() {
    if (!task) return
    if (!confirm(`Удалить задачу «${task.title}»?`)) return
    try {
      await deleteTask(taskId)
      navigate('/tasks')
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось удалить задачу') })
    }
  }

  async function saveTitle(title: string) {
    try {
      const updated = await updateTask(taskId, { title })
      setTask(updated)
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось сохранить название') })
    }
  }

  if (loading || !task) {
    return (
      <Center h={300}>
        <Loader />
      </Center>
    )
  }

  const paymentsTotal = task.incomes.reduce((sum, i) => sum + Number(i.amount), 0)

  return (
    <Stack>
      <Group justify="space-between" align="flex-start">
        <Stack gap={4} style={{ flex: 1 }}>
          <Text c="dimmed" size="sm">
            {task.client.name}
          </Text>
          {isAdmin ? (
            <InlineTextCell value={task.title} onCommit={saveTitle} size="lg" fw={700} width={420} />
          ) : (
            <Title order={2}>{task.title}</Title>
          )}
        </Stack>
        <Group>
          <StageSelect stages={stages} value={task.stage.id} onChange={handleStageChange} />
          {isAdmin && (
            <ActionIcon color="red" variant="subtle" onClick={handleDeleteTask}>
              <IconTrash size={18} />
            </ActionIcon>
          )}
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <TaskInfoCard task={task} isAdmin={isAdmin} onSaved={setTask} />
        <Card shadow="sm" radius="md">
          <Group justify="space-between" mb={financeOpened ? 'xs' : 0}>
            <Text size="sm" c="dimmed">
              Финансы по задаче
            </Text>
            <ActionIcon
              variant="subtle"
              onClick={toggleFinance}
              aria-label={financeOpened ? 'Свернуть' : 'Развернуть'}
            >
              {financeOpened ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
            </ActionIcon>
          </Group>
          <Collapse in={financeOpened}>
            <SimpleGrid cols={2} spacing="xs">
              <FinanceStat label="К оплате" value={task.invoice_total} formatMoney={formatMoney} />
              <FinanceStat label="Оплачено" value={String(paymentsTotal)} formatMoney={formatMoney} />
              <FinanceStat
                label="Задолженность"
                value={task.debt}
                formatMoney={formatMoney}
                color={Number(task.debt) > 0 ? 'red' : 'teal'}
              />
              <FinanceStat
                label="Прибыль"
                value={task.profit}
                formatMoney={formatMoney}
                color={Number(task.profit) >= 0 ? 'teal' : 'red'}
              />
            </SimpleGrid>
            <Text size="xs" c="dimmed" mt={8}>
              К оплате = стоимость работ + сумма запчастей. Задолженность = к оплате − оплачено.
              Прибыль = стоимость работ + маржа по запчастям − расходы − зарплаты.
            </Text>
          </Collapse>
        </Card>
      </SimpleGrid>

      <AssignmentsSection task={task} users={users} isAdmin={isAdmin} refresh={async () => setTask(await getTask(taskId))} />

      <WorksSection
        taskId={taskId}
        works={task.works}
        users={users}
        catalog={serviceCatalog}
        refresh={async () => setTask(await getTask(taskId))}
      />

      <PartsSection
        taskId={taskId}
        parts={task.parts}
        catalog={partCatalog}
        refresh={async () => setTask(await getTask(taskId))}
      />

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <MoneyItemsSection
          title="Оплаты"
          hint="Деньги, фактически полученные от клиента по этой задаче"
          taskId={taskId}
          items={task.incomes}
          addFn={addIncome}
          updateFn={updateIncome}
          deleteFn={deleteIncome}
          refresh={async () => setTask(await getTask(taskId))}
          isAdmin={isAdmin}
        />
        <MoneyItemsSection
          title="Расходы"
          taskId={taskId}
          items={task.expenses}
          addFn={addExpense}
          updateFn={updateExpense}
          deleteFn={deleteExpense}
          refresh={async () => setTask(await getTask(taskId))}
          isAdmin={isAdmin}
        />
      </SimpleGrid>

      <ParticipationsSection
        taskId={taskId}
        participations={task.participations}
        users={users}
        refresh={async () => setTask(await getTask(taskId))}
        isAdmin={isAdmin}
      />
    </Stack>
  )
}

// ---- Task info (title/description) ----

function TaskInfoCard({
  task,
  isAdmin,
  onSaved,
}: {
  task: TaskDetail
  isAdmin: boolean
  onSaved: (t: TaskDetail) => void
}) {
  const [opened, { open, close }] = useDisclosure(false)
  const form = useForm({ initialValues: { description: task.description ?? '' } })

  async function handleSubmit(values: typeof form.values) {
    try {
      const updated = await updateTask(task.id, values)
      onSaved(updated)
      close()
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось сохранить') })
    }
  }

  return (
    <Card shadow="sm" radius="md">
      <Group justify="space-between" mb="xs">
        <Text size="sm" c="dimmed">
          Описание
        </Text>
        {isAdmin && (
          <ActionIcon variant="subtle" onClick={open}>
            <IconEdit size={16} />
          </ActionIcon>
        )}
      </Group>
      <Text>{task.description || '—'}</Text>

      <Modal opened={opened} onClose={close} title="Редактировать описание">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <Textarea label="Описание" {...form.getInputProps('description')} />
            <Button type="submit">Сохранить</Button>
          </Stack>
        </form>
      </Modal>
    </Card>
  )
}

// ---- Assignments ----

function AssignmentsSection({
  task,
  users,
  isAdmin,
  refresh,
}: {
  task: TaskDetail
  users: User[]
  isAdmin: boolean
  refresh: () => Promise<void>
}) {
  const [opened, { open, close }] = useDisclosure(false)
  const form = useForm({ initialValues: { user_id: '', role_in_task: 'executor' as 'executor' | 'controller' } })

  async function handleAdd(values: typeof form.values) {
    if (!values.user_id) return
    try {
      await addAssignment(task.id, Number(values.user_id), values.role_in_task)
      close()
      form.reset()
      await refresh()
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось добавить участника') })
    }
  }

  async function handleRemove(assignmentId: number) {
    try {
      await removeAssignment(task.id, assignmentId)
      await refresh()
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось удалить участника') })
    }
  }

  return (
    <Card shadow="sm" radius="md">
      <Group justify="space-between" mb="xs">
        <Text fw={600}>Участники</Text>
        {isAdmin && (
          <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={open}>
            Добавить
          </Button>
        )}
      </Group>
      <Group gap="xs">
        {task.assignments.map((a) => (
          <Badge
            key={a.id}
            variant="light"
            rightSection={
              isAdmin ? (
                <ActionIcon size="xs" color="red" variant="transparent" onClick={() => handleRemove(a.id)}>
                  <IconTrash size={12} />
                </ActionIcon>
              ) : undefined
            }
          >
            {a.user.full_name} · {a.role_in_task === 'executor' ? 'исполнитель' : 'контролёр'}
          </Badge>
        ))}
        {task.assignments.length === 0 && (
          <Text size="sm" c="dimmed">
            Участники не назначены
          </Text>
        )}
      </Group>

      <Modal opened={opened} onClose={close} title="Добавить участника">
        <form onSubmit={form.onSubmit(handleAdd)}>
          <Stack>
            <Select
              label="Сотрудник"
              data={users.map((u) => ({ value: String(u.id), label: u.full_name }))}
              searchable
              required
              {...form.getInputProps('user_id')}
            />
            <Select
              label="Роль в задаче"
              data={[
                { value: 'executor', label: 'Исполнитель' },
                { value: 'controller', label: 'Контролёр' },
              ]}
              allowDeselect={false}
              {...form.getInputProps('role_in_task')}
            />
            <Button type="submit">Добавить</Button>
          </Stack>
        </form>
      </Modal>
    </Card>
  )
}

// ---- Works ----

function WorksSection({
  taskId,
  works,
  users,
  catalog,
  refresh,
}: {
  taskId: number
  works: Work[]
  users: User[]
  catalog: ServiceCatalogItem[]
  refresh: () => Promise<void>
}) {
  const { formatMoney } = useSettings()
  const [opened, { open, close }] = useDisclosure(false)
  const form = useForm({
    initialValues: {
      catalog_item_id: null as number | null,
      description: '',
      service_price: 0,
      planned_start: new Date(),
      planned_end: new Date(),
      status: 'planned' as 'planned' | 'done',
      assignee_id: '' as string,
    },
  })

  function openCreate() {
    const now = new Date()
    form.setValues({
      catalog_item_id: null,
      description: '',
      service_price: 0,
      planned_start: now,
      planned_end: now,
      status: 'planned',
      assignee_id: '',
    })
    open()
  }

  function handleCatalogPick(id: number | null, item: ServiceCatalogItem | null) {
    form.setFieldValue('catalog_item_id', id)
    if (item) {
      form.setFieldValue('description', item.name)
      if (item.default_price != null) form.setFieldValue('service_price', Number(item.default_price))
    }
  }

  async function handleSubmit(values: typeof form.values) {
    const payload = {
      catalog_item_id: values.catalog_item_id,
      description: values.description,
      service_price: String(values.service_price),
      planned_start: values.planned_start.toISOString(),
      planned_end: values.planned_end.toISOString(),
      status: values.status,
      assignee_id: values.assignee_id ? Number(values.assignee_id) : null,
    }
    try {
      await addWork(taskId, payload)
      close()
      await refresh()
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось сохранить работу') })
    }
  }

  async function saveWork(workId: number, payload: Partial<WorkPayload>) {
    try {
      await updateWork(taskId, workId, payload)
      await refresh()
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось сохранить работу') })
      await refresh()
    }
  }

  async function handleDelete(workId: number) {
    if (!confirm('Удалить работу?')) return
    try {
      await deleteWork(taskId, workId)
      await refresh()
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось удалить работу') })
    }
  }

  const totalServicePrice = works.reduce((sum, w) => sum + Number(w.service_price), 0)

  return (
    <Card shadow="sm" radius="md">
      <Group justify="space-between" mb="xs">
        <Text fw={600}>Работы</Text>
        <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={openCreate}>
          Добавить
        </Button>
      </Group>
      <Table verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Описание</Table.Th>
            <Table.Th>Начало</Table.Th>
            <Table.Th>Окончание</Table.Th>
            <Table.Th>Исполнитель</Table.Th>
            <Table.Th>Статус</Table.Th>
            <Table.Th>Стоимость услуги</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {works.map((w) => (
            <Table.Tr key={w.id}>
              <Table.Td>
                <InlineTextCell
                  value={w.description}
                  width={200}
                  onCommit={(v) => saveWork(w.id, { description: v })}
                />
              </Table.Td>
              <Table.Td>
                <DateTimePicker
                  size="xs"
                  w={150}
                  valueFormat="DD.MM.YYYY HH:mm"
                  value={new Date(w.planned_start)}
                  onChange={(d) => d && saveWork(w.id, { planned_start: d.toISOString() })}
                />
              </Table.Td>
              <Table.Td>
                <DateTimePicker
                  size="xs"
                  w={150}
                  valueFormat="DD.MM.YYYY HH:mm"
                  value={new Date(w.planned_end)}
                  onChange={(d) => d && saveWork(w.id, { planned_end: d.toISOString() })}
                />
              </Table.Td>
              <Table.Td>
                <Select
                  size="xs"
                  w={140}
                  data={users.map((u) => ({ value: String(u.id), label: u.full_name }))}
                  searchable
                  clearable
                  value={w.assignee_id ? String(w.assignee_id) : null}
                  onChange={(v) => saveWork(w.id, { assignee_id: v ? Number(v) : null })}
                />
              </Table.Td>
              <Table.Td>
                <Select
                  size="xs"
                  w={140}
                  data={[
                    { value: 'planned', label: 'Запланирована' },
                    { value: 'done', label: 'Выполнена' },
                  ]}
                  allowDeselect={false}
                  value={w.status}
                  onChange={(v) => v && saveWork(w.id, { status: v as 'planned' | 'done' })}
                />
              </Table.Td>
              <Table.Td>
                <InlineNumberCell
                  value={Number(w.service_price)}
                  onCommit={(v) => saveWork(w.id, { service_price: String(v) })}
                />
              </Table.Td>
              <Table.Td>
                <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(w.id)}>
                  <IconTrash size={14} />
                </ActionIcon>
              </Table.Td>
            </Table.Tr>
          ))}
          {works.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={7}>
                <Text c="dimmed" size="sm" ta="center" py="sm">
                  Работ пока нет
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
      {works.length > 0 && (
        <Text ta="right" size="sm" fw={600} mt={4}>
          Итого: {formatMoney(String(totalServicePrice))}
        </Text>
      )}

      <Modal opened={opened} onClose={close} title="Новая работа">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <CatalogPicker items={catalog} value={form.values.catalog_item_id} onChange={handleCatalogPick} />
            <TextInput label="Описание" required {...form.getInputProps('description')} />
            <NumberInput
              label="Стоимость услуги"
              min={0}
              decimalScale={2}
              onFocus={selectOnFocus}
              {...form.getInputProps('service_price')}
            />
            <DateTimePicker label="Плановое начало" required valueFormat="DD.MM.YYYY HH:mm" {...form.getInputProps('planned_start')} />
            <DateTimePicker label="Плановое окончание" required valueFormat="DD.MM.YYYY HH:mm" {...form.getInputProps('planned_end')} />
            <Select
              label="Исполнитель"
              data={users.map((u) => ({ value: String(u.id), label: u.full_name }))}
              searchable
              clearable
              {...form.getInputProps('assignee_id')}
            />
            <Select
              label="Статус"
              data={[
                { value: 'planned', label: 'Запланирована' },
                { value: 'done', label: 'Выполнена' },
              ]}
              allowDeselect={false}
              {...form.getInputProps('status')}
            />
            <Button type="submit">Сохранить</Button>
          </Stack>
        </form>
      </Modal>
    </Card>
  )
}

// ---- Parts ----

function PartsSection({
  taskId,
  parts,
  catalog,
  refresh,
}: {
  taskId: number
  parts: Part[]
  catalog: PartCatalogItem[]
  refresh: () => Promise<void>
}) {
  const { formatMoney } = useSettings()
  const [opened, { open, close }] = useDisclosure(false)
  const [marginOpened, { toggle: toggleMargin }] = useDisclosure(false)
  const form = useForm({
    initialValues: { catalog_item_id: null as number | null, name: '', quantity: 1, price_per_unit: 0, purchase_price: 0 },
  })

  function openCreate() {
    form.setValues({ catalog_item_id: null, name: '', quantity: 1, price_per_unit: 0, purchase_price: 0 })
    open()
  }

  function handleCatalogPick(id: number | null, item: PartCatalogItem | null) {
    form.setFieldValue('catalog_item_id', id)
    if (item) {
      form.setFieldValue('name', item.name)
      if (item.default_sale_price != null) form.setFieldValue('price_per_unit', Number(item.default_sale_price))
      if (item.default_purchase_price != null) form.setFieldValue('purchase_price', Number(item.default_purchase_price))
    }
  }

  async function handleSubmit(values: typeof form.values) {
    const payload = {
      catalog_item_id: values.catalog_item_id,
      name: values.name,
      quantity: String(values.quantity),
      price_per_unit: String(values.price_per_unit),
      purchase_price: String(values.purchase_price),
    }
    try {
      await addPart(taskId, payload)
      close()
      await refresh()
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось сохранить запчасть') })
    }
  }

  async function savePart(partId: number, payload: Partial<PartPayload>) {
    try {
      await updatePart(taskId, partId, payload)
      await refresh()
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось сохранить запчасть') })
      await refresh()
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Удалить запчасть?')) return
    try {
      await deletePart(taskId, id)
      await refresh()
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось удалить запчасть') })
    }
  }

  const totalMargin = parts.reduce((sum, p) => sum + Number(p.margin), 0)

  return (
    <Card shadow="sm" radius="md">
      <Group justify="space-between" mb="xs">
        <Text fw={600}>Запчасти</Text>
        <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={openCreate}>
          Добавить
        </Button>
      </Group>
      <Table verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Наименование</Table.Th>
            <Table.Th>Кол-во</Table.Th>
            <Table.Th>Цена продажи</Table.Th>
            <Table.Th>Цена закупки</Table.Th>
            <Table.Th>Сумма</Table.Th>
            <Table.Th>Маржа</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {parts.map((p) => (
            <Table.Tr key={p.id}>
              <Table.Td>
                <InlineTextCell value={p.name} width={180} onCommit={(v) => savePart(p.id, { name: v })} />
              </Table.Td>
              <Table.Td>
                <InlineNumberCell
                  value={Number(p.quantity)}
                  decimalScale={3}
                  width={90}
                  onCommit={(v) => savePart(p.id, { quantity: String(v) })}
                />
              </Table.Td>
              <Table.Td>
                <InlineNumberCell
                  value={Number(p.price_per_unit)}
                  onCommit={(v) => savePart(p.id, { price_per_unit: String(v) })}
                />
              </Table.Td>
              <Table.Td>
                <InlineNumberCell
                  value={Number(p.purchase_price)}
                  onCommit={(v) => savePart(p.id, { purchase_price: String(v) })}
                />
              </Table.Td>
              <Table.Td>{formatMoney(p.amount)}</Table.Td>
              <Table.Td>{formatMoney(p.margin)}</Table.Td>
              <Table.Td>
                <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(p.id)}>
                  <IconTrash size={14} />
                </ActionIcon>
              </Table.Td>
            </Table.Tr>
          ))}
          {parts.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={7}>
                <Text c="dimmed" size="sm" ta="center" py="sm">
                  Запчастей пока нет
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
      {parts.length > 0 && (
        <Stack gap={0} mt={4}>
          <Group justify="flex-end" gap={4}>
            <Text
              size="sm"
              c="dimmed"
              style={{ cursor: 'pointer' }}
              onClick={toggleMargin}
            >
              {marginOpened ? 'Скрыть маржу по запчастям' : 'Показать маржу по запчастям'}
            </Text>
            <ActionIcon
              size="sm"
              variant="subtle"
              onClick={toggleMargin}
              aria-label={marginOpened ? 'Скрыть маржу по запчастям' : 'Показать маржу по запчастям'}
            >
              {marginOpened ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
            </ActionIcon>
          </Group>
          <Collapse in={marginOpened}>
            <Text ta="right" size="sm" fw={600}>
              Маржа по запчастям: {formatMoney(String(totalMargin))}
            </Text>
          </Collapse>
        </Stack>
      )}

      <Modal opened={opened} onClose={close} title="Новая запчасть">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <CatalogPicker items={catalog} value={form.values.catalog_item_id} onChange={handleCatalogPick} />
            <TextInput label="Наименование" required {...form.getInputProps('name')} />
            <NumberInput
              label="Количество"
              min={0}
              decimalScale={3}
              required
              onFocus={selectOnFocus}
              {...form.getInputProps('quantity')}
            />
            <NumberInput
              label="Цена продажи, за единицу"
              min={0}
              decimalScale={2}
              required
              onFocus={selectOnFocus}
              {...form.getInputProps('price_per_unit')}
            />
            <NumberInput
              label="Цена закупки, за единицу"
              min={0}
              decimalScale={2}
              required
              onFocus={selectOnFocus}
              {...form.getInputProps('purchase_price')}
            />
            <Button type="submit">Сохранить</Button>
          </Stack>
        </form>
      </Modal>
    </Card>
  )
}

// ---- Expenses / incomes (shared shape) ----

function MoneyItemsSection({
  title,
  hint,
  taskId,
  items,
  addFn,
  updateFn,
  deleteFn,
  refresh,
  isAdmin,
}: {
  title: string
  hint?: string
  taskId: number
  items: MoneyItem[]
  addFn: (taskId: number, payload: { description: string; amount: string }) => Promise<MoneyItem>
  updateFn: (taskId: number, id: number, payload: Partial<{ description: string; amount: string }>) => Promise<MoneyItem>
  deleteFn: (taskId: number, id: number) => Promise<unknown>
  refresh: () => Promise<void>
  isAdmin: boolean
}) {
  const { formatMoney } = useSettings()
  const [opened, { open, close }] = useDisclosure(false)
  const form = useForm({ initialValues: { description: '', amount: 0 } })

  function openCreate() {
    form.setValues({ description: '', amount: 0 })
    open()
  }

  async function handleSubmit(values: typeof form.values) {
    const payload = { description: values.description, amount: String(values.amount) }
    try {
      await addFn(taskId, payload)
      close()
      await refresh()
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось сохранить') })
    }
  }

  async function saveItem(id: number, payload: Partial<{ description: string; amount: string }>) {
    try {
      await updateFn(taskId, id, payload)
      await refresh()
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось сохранить') })
      await refresh()
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Удалить запись?')) return
    try {
      await deleteFn(taskId, id)
      await refresh()
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось удалить') })
    }
  }

  const total = items.reduce((sum, i) => sum + Number(i.amount), 0)

  return (
    <Card shadow="sm" radius="md">
      <Group justify="space-between" mb={hint ? 0 : 'xs'}>
        <Text fw={600}>{title}</Text>
        {isAdmin && (
          <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={openCreate}>
            Добавить
          </Button>
        )}
      </Group>
      {hint && (
        <Text size="xs" c="dimmed" mb="xs">
          {hint}
        </Text>
      )}
      <Table verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Описание</Table.Th>
            <Table.Th>Сумма</Table.Th>
            {isAdmin && <Table.Th />}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {items.map((i) => (
            <Table.Tr key={i.id}>
              <Table.Td>
                {isAdmin ? (
                  <InlineTextCell
                    value={i.description}
                    width={200}
                    onCommit={(v) => saveItem(i.id, { description: v })}
                  />
                ) : (
                  i.description
                )}
              </Table.Td>
              <Table.Td>
                {isAdmin ? (
                  <InlineNumberCell value={Number(i.amount)} onCommit={(v) => saveItem(i.id, { amount: String(v) })} />
                ) : (
                  formatMoney(i.amount)
                )}
              </Table.Td>
              {isAdmin && (
                <Table.Td>
                  <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(i.id)}>
                    <IconTrash size={14} />
                  </ActionIcon>
                </Table.Td>
              )}
            </Table.Tr>
          ))}
          {items.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={isAdmin ? 3 : 2}>
                <Text c="dimmed" size="sm" ta="center" py="sm">
                  Записей пока нет
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
      {items.length > 0 && (
        <Text ta="right" size="sm" fw={600} mt={4}>
          Итого: {formatMoney(String(total))}
        </Text>
      )}

      <Modal opened={opened} onClose={close} title="Новая запись">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput label="Описание" required {...form.getInputProps('description')} />
            <NumberInput
              label="Сумма"
              min={0}
              decimalScale={2}
              required
              onFocus={selectOnFocus}
              {...form.getInputProps('amount')}
            />
            <Button type="submit">Сохранить</Button>
          </Stack>
        </form>
      </Modal>
    </Card>
  )
}

// ---- Participations (salary) ----

function ParticipationsSection({
  taskId,
  participations,
  users,
  refresh,
  isAdmin,
}: {
  taskId: number
  participations: Participation[]
  users: User[]
  refresh: () => Promise<void>
  isAdmin: boolean
}) {
  const { formatMoney } = useSettings()
  const [opened, { open, close }] = useDisclosure(false)
  const form = useForm({ initialValues: { user_id: '', hours: 0, amount: 0 } })

  const availableUsers = users.filter((u) => !participations.some((p) => p.user_id === u.id))
  const selectedUser = users.find((u) => String(u.id) === form.values.user_id)

  function openCreate() {
    form.setValues({ user_id: '', hours: 0, amount: 0 })
    open()
  }

  async function handleUserPick(userId: string) {
    form.setFieldValue('user_id', userId)
    if (!userId) return
    const user = users.find((u) => String(u.id) === userId)
    if (user?.rate_type === 'hourly') {
      try {
        const suggestion = await suggestParticipation(taskId, Number(userId))
        form.setFieldValue('hours', suggestion.hours ? Number(suggestion.hours) : 0)
        form.setFieldValue('amount', Number(suggestion.amount))
      } catch {
        // suggestion is a convenience only; ignore failures
      }
    }
  }

  async function handleSubmit(values: typeof form.values) {
    if (!values.user_id) return
    const isHourly = selectedUser?.rate_type === 'hourly'
    try {
      await addParticipation(taskId, Number(values.user_id), isHourly ? String(values.hours) : null, String(values.amount))
      close()
      await refresh()
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось сохранить участие') })
    }
  }

  async function saveParticipation(id: number, payload: Partial<{ hours: string | null; amount: string }>) {
    try {
      await updateParticipation(taskId, id, payload)
      await refresh()
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось сохранить участие') })
      await refresh()
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Удалить запись об участии?')) return
    try {
      await deleteParticipation(taskId, id)
      await refresh()
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось удалить') })
    }
  }

  const total = participations.reduce((sum, p) => sum + Number(p.amount), 0)

  return (
    <Card shadow="sm" radius="md">
      <Group justify="space-between" mb="xs">
        <Text fw={600}>Зарплата по задаче</Text>
        {isAdmin && (
          <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={openCreate}>
            Добавить участие
          </Button>
        )}
      </Group>
      <Table verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Сотрудник</Table.Th>
            <Table.Th>Тип ставки</Table.Th>
            <Table.Th>Часы</Table.Th>
            <Table.Th>Начислено</Table.Th>
            {isAdmin && <Table.Th />}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {participations.map((p) => (
            <Table.Tr key={p.id}>
              <Table.Td>{p.user.full_name}</Table.Td>
              <Table.Td>{p.user.rate_type === 'hourly' ? 'Почасовая' : 'Фиксированная'}</Table.Td>
              <Table.Td>
                {isAdmin && p.user.rate_type === 'hourly' ? (
                  <InlineNumberCell
                    value={p.hours ? Number(p.hours) : 0}
                    width={90}
                    onCommit={(v) => saveParticipation(p.id, { hours: String(v) })}
                  />
                ) : (
                  (p.hours ?? '—')
                )}
              </Table.Td>
              <Table.Td>
                {isAdmin ? (
                  <InlineNumberCell
                    value={Number(p.amount)}
                    onCommit={(v) => saveParticipation(p.id, { amount: String(v) })}
                  />
                ) : (
                  formatMoney(p.amount)
                )}
              </Table.Td>
              {isAdmin && (
                <Table.Td>
                  <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(p.id)}>
                    <IconTrash size={14} />
                  </ActionIcon>
                </Table.Td>
              )}
            </Table.Tr>
          ))}
          {participations.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={isAdmin ? 5 : 4}>
                <Text c="dimmed" size="sm" ta="center" py="sm">
                  Участие пока не отмечено
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
      {participations.length > 0 && (
        <Text ta="right" size="sm" fw={600} mt={4}>
          Итого: {formatMoney(String(total))}
        </Text>
      )}

      <Modal opened={opened} onClose={close} title="Добавить участие">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <Select
              label="Сотрудник"
              data={availableUsers.map((u) => ({ value: String(u.id), label: u.full_name }))}
              searchable
              required
              value={form.values.user_id}
              onChange={(v) => v && handleUserPick(v)}
            />
            {selectedUser?.rate_type === 'hourly' && (
              <NumberInput label="Часы" min={0} decimalScale={2} onFocus={selectOnFocus} {...form.getInputProps('hours')} />
            )}
            <NumberInput
              label="Сумма начисления"
              min={0}
              decimalScale={2}
              required
              onFocus={selectOnFocus}
              description={selectedUser?.rate_type === 'hourly' ? 'Подставлено автоматически (ставка × часы), можно скорректировать' : undefined}
              {...form.getInputProps('amount')}
            />
            <Button type="submit">Сохранить</Button>
          </Stack>
        </form>
      </Modal>
    </Card>
  )
}
