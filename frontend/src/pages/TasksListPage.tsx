import { Avatar, Button, Group, MultiSelect, Select, Stack, Table, Text, Textarea, TextInput, Title, Tooltip, Modal } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { IconPlus } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiErrorMessage } from '../api/client'
import { listClients } from '../api/clients'
import { listTaskStages } from '../api/taskStages'
import { changeTaskStage, createTask, listTasks } from '../api/tasks'
import type { Client, TaskListItem, TaskStage } from '../api/types'
import { listUsers } from '../api/users'
import type { User } from '../api/types'
import { StageSelect } from '../components/StageSelect'
import { useAuth } from '../context/AuthContext'

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
  const navigate = useNavigate()

  const [tasks, setTasks] = useState<TaskListItem[]>([])
  const [stages, setStages] = useState<TaskStage[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const [stageFilter, setStageFilter] = useState<string | null>(null)
  const [clientFilter, setClientFilter] = useState<string | null>(null)

  const [opened, { open, close }] = useDisclosure(false)
  const form = useForm<CreateFormValues>({ initialValues: EMPTY_FORM })

  function refresh() {
    setLoading(true)
    listTasks({
      stage_id: stageFilter ? Number(stageFilter) : undefined,
      client_id: clientFilter ? Number(clientFilter) : undefined,
    })
      .then(setTasks)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    listTaskStages().then(setStages)
    if (isAdmin) {
      listClients().then(setClients)
      listUsers().then(setUsers)
    }
  }, [isAdmin])

  useEffect(refresh, [stageFilter, clientFilter])

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

      <Table striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Клиент</Table.Th>
            <Table.Th>Задача</Table.Th>
            <Table.Th>Участники</Table.Th>
            <Table.Th>Этап</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {tasks.map((t) => (
            <Table.Tr key={t.id} style={{ cursor: 'pointer' }}>
              <Table.Td onClick={() => navigate(`/tasks/${t.id}`)}>{t.client.name}</Table.Td>
              <Table.Td onClick={() => navigate(`/tasks/${t.id}`)}>{t.title}</Table.Td>
              <Table.Td onClick={() => navigate(`/tasks/${t.id}`)}>
                <Avatar.Group>
                  {t.assignments.map((a) => (
                    <Tooltip key={a.id} label={`${a.user.full_name} (${a.role_in_task === 'executor' ? 'исполнитель' : 'контролёр'})`}>
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
                <StageSelect stages={stages} value={t.stage.id} onChange={(id) => handleStageChange(t.id, id)} />
              </Table.Td>
            </Table.Tr>
          ))}
          {!loading && tasks.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={4}>
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
            <Select
              label="Клиент"
              placeholder="Выберите клиента"
              data={clients.map((c) => ({ value: String(c.id), label: c.name }))}
              searchable
              required
              {...form.getInputProps('client_id')}
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
    </Stack>
  )
}
