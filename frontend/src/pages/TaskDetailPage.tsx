import {
  ActionIcon,
  Badge,
  Button,
  Card,
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
import { IconEdit, IconPlus, IconTrash } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
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
        <Stack gap={4}>
          <Text c="dimmed" size="sm">
            {task.client.name}
          </Text>
          <Title order={2}>{task.title}</Title>
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
          <Text size="sm" c="dimmed" mb="xs">
            Финансы по задаче
          </Text>
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
  const form = useForm({ initialValues: { title: task.title, description: task.description ?? '' } })

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

      <Modal opened={opened} onClose={close} title="Редактировать задачу">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput label="Название" required {...form.getInputProps('title')} />
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
  const [editing, setEditing] = useState<Work | null>(null)
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
    setEditing(null)
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

  function openEdit(w: Work) {
    setEditing(w)
    form.setValues({
      catalog_item_id: w.catalog_item_id,
      description: w.description,
      service_price: Number(w.service_price),
      planned_start: new Date(w.planned_start),
      planned_end: new Date(w.planned_end),
      status: w.status,
      assignee_id: w.assignee_id ? String(w.assignee_id) : '',
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
      if (editing) {
        await updateWork(taskId, editing.id, payload)
      } else {
        await addWork(taskId, payload)
      }
      close()
      await refresh()
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось сохранить работу') })
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

  const userName = (id: number | null) => users.find((u) => u.id === id)?.full_name ?? '—'
  const fmt = (s: string) => new Date(s).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
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
              <Table.Td>{w.description}</Table.Td>
              <Table.Td>{fmt(w.planned_start)}</Table.Td>
              <Table.Td>{fmt(w.planned_end)}</Table.Td>
              <Table.Td>{userName(w.assignee_id)}</Table.Td>
              <Table.Td>
                <Badge color={w.status === 'done' ? 'teal' : 'gray'} variant="light">
                  {w.status === 'done' ? 'выполнена' : 'запланирована'}
                </Badge>
              </Table.Td>
              <Table.Td>{formatMoney(w.service_price)}</Table.Td>
              <Table.Td>
                <Group gap="xs" justify="flex-end">
                  <ActionIcon variant="subtle" onClick={() => openEdit(w)}>
                    <IconEdit size={14} />
                  </ActionIcon>
                  <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(w.id)}>
                    <IconTrash size={14} />
                  </ActionIcon>
                </Group>
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

      <Modal opened={opened} onClose={close} title={editing ? 'Редактировать работу' : 'Новая работа'}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <CatalogPicker items={catalog} value={form.values.catalog_item_id} onChange={handleCatalogPick} />
            <TextInput label="Описание" required {...form.getInputProps('description')} />
            <NumberInput label="Стоимость услуги" min={0} decimalScale={2} {...form.getInputProps('service_price')} />
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
  const [editing, setEditing] = useState<Part | null>(null)
  const form = useForm({
    initialValues: { catalog_item_id: null as number | null, name: '', quantity: 1, price_per_unit: 0, purchase_price: 0 },
  })

  function openCreate() {
    setEditing(null)
    form.setValues({ catalog_item_id: null, name: '', quantity: 1, price_per_unit: 0, purchase_price: 0 })
    open()
  }

  function openEdit(p: Part) {
    setEditing(p)
    form.setValues({
      catalog_item_id: p.catalog_item_id,
      name: p.name,
      quantity: Number(p.quantity),
      price_per_unit: Number(p.price_per_unit),
      purchase_price: Number(p.purchase_price),
    })
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
      if (editing) await updatePart(taskId, editing.id, payload)
      else await addPart(taskId, payload)
      close()
      await refresh()
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось сохранить запчасть') })
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
              <Table.Td>{p.name}</Table.Td>
              <Table.Td>{p.quantity}</Table.Td>
              <Table.Td>{formatMoney(p.price_per_unit)}</Table.Td>
              <Table.Td>{formatMoney(p.purchase_price)}</Table.Td>
              <Table.Td>{formatMoney(p.amount)}</Table.Td>
              <Table.Td>{formatMoney(p.margin)}</Table.Td>
              <Table.Td>
                <Group gap="xs" justify="flex-end">
                  <ActionIcon variant="subtle" onClick={() => openEdit(p)}>
                    <IconEdit size={14} />
                  </ActionIcon>
                  <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(p.id)}>
                    <IconTrash size={14} />
                  </ActionIcon>
                </Group>
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
        <Text ta="right" size="sm" fw={600} mt={4}>
          Маржа по запчастям: {formatMoney(String(totalMargin))}
        </Text>
      )}

      <Modal opened={opened} onClose={close} title={editing ? 'Редактировать запчасть' : 'Новая запчасть'}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <CatalogPicker items={catalog} value={form.values.catalog_item_id} onChange={handleCatalogPick} />
            <TextInput label="Наименование" required {...form.getInputProps('name')} />
            <NumberInput label="Количество" min={0} decimalScale={3} required {...form.getInputProps('quantity')} />
            <NumberInput label="Цена продажи, за единицу" min={0} decimalScale={2} required {...form.getInputProps('price_per_unit')} />
            <NumberInput label="Цена закупки, за единицу" min={0} decimalScale={2} required {...form.getInputProps('purchase_price')} />
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
  const [editing, setEditing] = useState<MoneyItem | null>(null)
  const form = useForm({ initialValues: { description: '', amount: 0 } })

  function openCreate() {
    setEditing(null)
    form.setValues({ description: '', amount: 0 })
    open()
  }

  function openEdit(item: MoneyItem) {
    setEditing(item)
    form.setValues({ description: item.description, amount: Number(item.amount) })
    open()
  }

  async function handleSubmit(values: typeof form.values) {
    const payload = { description: values.description, amount: String(values.amount) }
    try {
      if (editing) await updateFn(taskId, editing.id, payload)
      else await addFn(taskId, payload)
      close()
      await refresh()
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось сохранить') })
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
              <Table.Td>{i.description}</Table.Td>
              <Table.Td>{formatMoney(i.amount)}</Table.Td>
              {isAdmin && (
                <Table.Td>
                  <Group gap="xs" justify="flex-end">
                    <ActionIcon variant="subtle" onClick={() => openEdit(i)}>
                      <IconEdit size={14} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(i.id)}>
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
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

      <Modal opened={opened} onClose={close} title={editing ? 'Редактировать запись' : 'Новая запись'}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput label="Описание" required {...form.getInputProps('description')} />
            <NumberInput label="Сумма" min={0} decimalScale={2} required {...form.getInputProps('amount')} />
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
  const [editing, setEditing] = useState<Participation | null>(null)
  const form = useForm({ initialValues: { user_id: '', hours: 0, amount: 0 } })

  const availableUsers = users.filter((u) => editing?.user_id === u.id || !participations.some((p) => p.user_id === u.id))
  const selectedUser = users.find((u) => String(u.id) === form.values.user_id)

  function openCreate() {
    setEditing(null)
    form.setValues({ user_id: '', hours: 0, amount: 0 })
    open()
  }

  function openEdit(p: Participation) {
    setEditing(p)
    form.setValues({ user_id: String(p.user_id), hours: p.hours ? Number(p.hours) : 0, amount: Number(p.amount) })
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
      if (editing) {
        await updateParticipation(taskId, editing.id, {
          hours: isHourly ? String(values.hours) : null,
          amount: String(values.amount),
        })
      } else {
        await addParticipation(taskId, Number(values.user_id), isHourly ? String(values.hours) : null, String(values.amount))
      }
      close()
      await refresh()
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось сохранить участие') })
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
              <Table.Td>{p.hours ?? '—'}</Table.Td>
              <Table.Td>{formatMoney(p.amount)}</Table.Td>
              {isAdmin && (
                <Table.Td>
                  <Group gap="xs" justify="flex-end">
                    <ActionIcon variant="subtle" onClick={() => openEdit(p)}>
                      <IconEdit size={14} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(p.id)}>
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
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

      <Modal opened={opened} onClose={close} title={editing ? 'Редактировать участие' : 'Добавить участие'}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <Select
              label="Сотрудник"
              data={availableUsers.map((u) => ({ value: String(u.id), label: u.full_name }))}
              searchable
              required
              disabled={!!editing}
              value={form.values.user_id}
              onChange={(v) => v && handleUserPick(v)}
            />
            {selectedUser?.rate_type === 'hourly' && (
              <NumberInput label="Часы" min={0} decimalScale={2} {...form.getInputProps('hours')} />
            )}
            <NumberInput
              label="Сумма начисления"
              min={0}
              decimalScale={2}
              required
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
