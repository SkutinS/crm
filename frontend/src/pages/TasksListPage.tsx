import { Avatar, Badge, Button, Checkbox, Group, MultiSelect, Paper, Select, Stack, Table, Text, Textarea, TextInput, Title, Tooltip, Modal } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { IconChevronDown, IconChevronRight, IconPlus, IconUsersGroup } from '@tabler/icons-react'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiErrorMessage } from '../api/client'
import { listClients } from '../api/clients'
import { addTasksToGroup, createTaskGroup, listTaskGroups } from '../api/taskGroups'
import { listTaskStages } from '../api/taskStages'
import { changeTaskStage, createTask, listTasks } from '../api/tasks'
import type { Client, TaskGroupListItem, TaskListItem, TaskStage } from '../api/types'
import { listUsers } from '../api/users'
import type { User } from '../api/types'
import { ClientPicker } from '../components/ClientPicker'
import { CreatableSelect } from '../components/CreatableSelect'
import { StageSelect } from '../components/StageSelect'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { buildTaskRows } from '../utils/taskGroupRows'

interface CreateFormValues {
  client_id: string | null
  title: string
  description: string
  executor_ids: string[]
  controller_ids: string[]
}

const EMPTY_FORM: CreateFormValues = {
  client_id: null,
  title: '',
  description: '',
  executor_ids: [],
  controller_ids: [],
}

export function TasksListPage() {
  const { isAdmin } = useAuth()
  const { formatMoney } = useSettings()
  const navigate = useNavigate()

  const [tasks, setTasks] = useState<TaskListItem[]>([])
  const [stages, setStages] = useState<TaskStage[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [groups, setGroups] = useState<TaskGroupListItem[]>([])
  const [loading, setLoading] = useState(true)

  const [stageFilter, setStageFilter] = useState<string | null>(null)
  const [clientFilter, setClientFilter] = useState<string | null>(null)

  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [mergeGroupId, setMergeGroupId] = useState<string | null>(null)
  const [mergeOpened, { open: openMerge, close: closeMerge }] = useDisclosure(false)

  // Collapsed-by-default would hide groups unexpectedly on first load, so we
  // track the opposite: ids the user has explicitly collapsed. Any group not
  // in this set (including ones not seen yet) renders expanded.
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<number>>(new Set())

  const [opened, { open, close }] = useDisclosure(false)
  const form = useForm<CreateFormValues>({ initialValues: EMPTY_FORM })

  // Loaded in full (not server-filtered) so a group's complete membership is
  // always known, even when some of its tasks don't match the active filter —
  // see taskMatches()/buildTaskRows() below. Client-side filtering is fine at
  // the current task-list scale; if this list grows into the hundreds, this
  // should move back to server-side filtering plus a dedicated lightweight
  // "group membership" endpoint.
  function refresh() {
    setLoading(true)
    listTasks()
      .then(setTasks)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    listTaskStages().then(setStages)
    if (isAdmin) {
      listClients().then(setClients)
      listUsers().then(setUsers)
      listTaskGroups().then(setGroups)
    }
  }, [isAdmin])

  useEffect(refresh, [])

  function toggleGroupCollapsed(groupId: number) {
    setCollapsedGroupIds((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  function taskMatchesFilters(t: TaskListItem) {
    if (stageFilter && String(t.stage.id) !== stageFilter) return false
    if (clientFilter && String(t.client.id) !== clientFilter) return false
    return true
  }

  const rows = useMemo(() => buildTaskRows(tasks), [tasks])
  const visibleRows = rows.filter((row) =>
    row.type === 'group' ? row.tasks.some(taskMatchesFilters) : taskMatchesFilters(row.task),
  )

  function toggleSelected(taskId: number) {
    setSelectedIds((prev) => (prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]))
  }

  function openMergeModal() {
    setMergeGroupId(null)
    openMerge()
  }

  async function handleMerge() {
    if (!mergeGroupId) return
    try {
      await addTasksToGroup(Number(mergeGroupId), selectedIds)
      closeMerge()
      setSelectedIds([])
      refresh()
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось объединить задачи в группу') })
    }
  }

  async function handleStageChange(taskId: number, stageId: number) {
    try {
      await changeTaskStage(taskId, stageId)
      refresh()
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось сменить этап') })
    }
  }

  function openCreate() {
    form.setValues(EMPTY_FORM)
    open()
  }

  async function handleCreate(values: CreateFormValues) {
    if (!values.client_id) {
      form.setFieldError('client_id', 'Выберите клиента')
      return
    }
    try {
      const task = await createTask({
        client_id: Number(values.client_id),
        title: values.title,
        description: values.description || null,
        assignments: [
          ...values.executor_ids.map((id) => ({ user_id: Number(id), role_in_task: 'executor' as const })),
          ...values.controller_ids.map((id) => ({ user_id: Number(id), role_in_task: 'controller' as const })),
        ],
      })
      close()
      navigate(`/tasks/${task.id}`)
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось создать задачу') })
    }
  }

  const userOptions = users.map((u) => ({ value: String(u.id), label: u.full_name }))

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Задачи</Title>
        {isAdmin && (
          <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
            Новая задача
          </Button>
        )}
      </Group>

      <Group>
        <Select
          placeholder="Все этапы"
          data={stages.map((s) => ({ value: String(s.id), label: s.name }))}
          value={stageFilter}
          onChange={setStageFilter}
          clearable
          w={200}
        />
        {isAdmin && (
          <Select
            placeholder="Все клиенты"
            data={clients.map((c) => ({ value: String(c.id), label: c.name }))}
            value={clientFilter}
            onChange={setClientFilter}
            clearable
            searchable
            w={220}
          />
        )}
      </Group>

      {isAdmin && selectedIds.length > 0 && (
        <Paper withBorder p="xs">
          <Group justify="space-between">
            <Text size="sm">Выбрано задач: {selectedIds.length}</Text>
            <Group gap="xs">
              <Button variant="subtle" size="xs" onClick={() => setSelectedIds([])}>
                Отменить выбор
              </Button>
              <Button size="xs" leftSection={<IconUsersGroup size={14} />} onClick={openMergeModal}>
                Объединить в группу
              </Button>
            </Group>
          </Group>
        </Paper>
      )}

      <Table striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            {isAdmin && <Table.Th />}
            <Table.Th>Клиент</Table.Th>
            <Table.Th>Задача</Table.Th>
            <Table.Th>Дата</Table.Th>
            <Table.Th>Сумма</Table.Th>
            <Table.Th>Участники</Table.Th>
            <Table.Th>Этап</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {visibleRows.map((row) => {
            if (row.type === 'task') {
              return (
                <TaskRowCells
                  key={row.task.id}
                  task={row.task}
                  isAdmin={isAdmin}
                  selected={selectedIds.includes(row.task.id)}
                  onToggleSelected={() => toggleSelected(row.task.id)}
                  stages={stages}
                  onStageChange={handleStageChange}
                  formatMoney={formatMoney}
                  navigate={navigate}
                />
              )
            }

            const groupProfit = row.tasks.reduce((sum, t) => sum + Number(t.profit), 0)
            const collapsed = collapsedGroupIds.has(row.group.id)

            return (
              <Fragment key={`group-${row.group.id}`}>
                <Table.Tr
                  style={{ cursor: 'pointer', background: 'var(--mantine-color-default-hover)' }}
                  onClick={() => navigate(`/task-groups/${row.group.id}`)}
                >
                  <Table.Td colSpan={isAdmin ? 7 : 6}>
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="xs" wrap="nowrap">
                        <Button
                          variant="subtle"
                          color="gray"
                          size="xs"
                          px={4}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleGroupCollapsed(row.group.id)
                          }}
                        >
                          {collapsed ? <IconChevronRight size={16} /> : <IconChevronDown size={16} />}
                        </Button>
                        <Text fw={600}>{row.group.name}</Text>
                        <Badge variant="light" color="gray">
                          {row.tasks.length} {row.tasks.length === 1 ? 'задача' : 'задач'}
                        </Badge>
                      </Group>
                      <Text fw={600} c={groupProfit >= 0 ? 'teal' : 'red'}>
                        {formatMoney(String(groupProfit))}
                      </Text>
                    </Group>
                  </Table.Td>
                </Table.Tr>
                {!collapsed &&
                  row.tasks.map((t) => (
                    <TaskRowCells
                      key={t.id}
                      task={t}
                      isAdmin={isAdmin}
                      selected={selectedIds.includes(t.id)}
                      onToggleSelected={() => toggleSelected(t.id)}
                      stages={stages}
                      onStageChange={handleStageChange}
                      formatMoney={formatMoney}
                      navigate={navigate}
                      indented
                      dimmed={!taskMatchesFilters(t)}
                    />
                  ))}
              </Fragment>
            )
          })}
          {!loading && visibleRows.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={isAdmin ? 7 : 6}>
                <Text c="dimmed" ta="center" py="md">
                  Задач пока нет
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>

      <Modal opened={opened} onClose={close} title="Новая задача" size="lg">
        <form onSubmit={form.onSubmit(handleCreate)}>
          <Stack>
            <ClientPicker
              clients={clients}
              value={form.values.client_id}
              onChange={(v) => form.setFieldValue('client_id', v)}
              onClientCreated={(client) => setClients((prev) => [...prev, client])}
              required
              error={form.errors.client_id}
            />
            <TextInput label="Название/описание задачи" required {...form.getInputProps('title')} />
            <Textarea label="Подробное описание" {...form.getInputProps('description')} />
            <MultiSelect
              label="Исполнители"
              data={userOptions}
              searchable
              {...form.getInputProps('executor_ids')}
            />
            <MultiSelect
              label="Контролёры"
              data={userOptions}
              searchable
              {...form.getInputProps('controller_ids')}
            />
            <Button type="submit" mt="sm">
              Создать
            </Button>
          </Stack>
        </form>
      </Modal>

      <Modal opened={mergeOpened} onClose={closeMerge} title="Объединить в группу">
        <Stack>
          <Text size="sm" c="dimmed">
            Выбрано задач: {selectedIds.length}. Укажите существующую группу или введите название новой.
          </Text>
          <CreatableSelect
            label="Группа"
            placeholder="Выберите или создайте группу"
            data={groups.map((g) => ({ value: String(g.id), label: g.name }))}
            value={mergeGroupId}
            onChange={setMergeGroupId}
            canCreate
            onCreate={async (name) => {
              const group = await createTaskGroup(name)
              return { option: { value: String(group.id), label: group.name }, record: group }
            }}
            onCreated={(group) => setGroups((prev) => [...prev, group])}
          />
          <Button onClick={handleMerge} disabled={!mergeGroupId}>
            Объединить
          </Button>
        </Stack>
      </Modal>
    </Stack>
  )
}

function TaskRowCells({
  task,
  isAdmin,
  selected,
  onToggleSelected,
  stages,
  onStageChange,
  formatMoney,
  navigate,
  indented = false,
  dimmed = false,
}: {
  task: TaskListItem
  isAdmin: boolean
  selected: boolean
  onToggleSelected: () => void
  stages: TaskStage[]
  onStageChange: (taskId: number, stageId: number) => void
  formatMoney: (v: string) => string
  navigate: (path: string) => void
  indented?: boolean
  dimmed?: boolean
}) {
  const goToTask = () => navigate(`/tasks/${task.id}`)

  return (
    <Table.Tr style={{ cursor: 'pointer', opacity: dimmed ? 0.5 : 1 }}>
      {isAdmin && (
        <Table.Td onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={selected} onChange={onToggleSelected} />
        </Table.Td>
      )}
      <Table.Td onClick={goToTask} pl={indented ? 36 : undefined}>
        {task.client.name}
      </Table.Td>
      <Table.Td onClick={goToTask}>
        {task.title}
        {dimmed && (
          <Text span size="xs" c="dimmed" ml={6}>
            (не соответствует фильтру)
          </Text>
        )}
      </Table.Td>
      <Table.Td onClick={goToTask}>{new Date(task.created_at).toLocaleDateString('ru-RU')}</Table.Td>
      <Table.Td onClick={goToTask}>{formatMoney(task.invoice_total)}</Table.Td>
      <Table.Td onClick={goToTask}>
        <Avatar.Group>
          {task.assignments.map((a) => (
            <Tooltip
              key={a.id}
              label={`${a.user.full_name} (${a.role_in_task === 'executor' ? 'исполнитель' : 'контролёр'})`}
            >
              <Avatar radius="xl" size="sm">
                {a.user.full_name
                  .split(' ')
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join('')}
              </Avatar>
            </Tooltip>
          ))}
        </Avatar.Group>
      </Table.Td>
      <Table.Td onClick={(e) => e.stopPropagation()}>
        <StageSelect stages={stages} value={task.stage.id} onChange={(id) => onStageChange(task.id, id)} />
      </Table.Td>
    </Table.Tr>
  )
}
