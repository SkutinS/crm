import {
  ActionIcon,
  Alert,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Modal,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { IconEdit, IconTrash, IconX } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiErrorMessage } from '../api/client'
import { deleteTaskGroup, getTaskGroup, removeTaskFromGroup, renameTaskGroup } from '../api/taskGroups'
import type { TaskGroupDetail } from '../api/types'
import { FinanceStat } from '../components/FinanceStat'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'

export function TaskGroupDetailPage() {
  const { id } = useParams()
  const groupId = Number(id)
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { formatMoney } = useSettings()

  const [group, setGroup] = useState<TaskGroupDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [renameOpened, { open: openRename, close: closeRename }] = useDisclosure(false)
  const renameForm = useForm({ initialValues: { name: '' } })

  function refresh() {
    setLoading(true)
    getTaskGroup(groupId)
      .then(setGroup)
      .finally(() => setLoading(false))
  }

  useEffect(refresh, [groupId])

  function openRenameModal() {
    if (!group) return
    renameForm.setValues({ name: group.name })
    openRename()
  }

  async function handleRename(values: { name: string }) {
    try {
      await renameTaskGroup(groupId, values.name)
      closeRename()
      refresh()
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось переименовать группу') })
    }
  }

  async function handleDeleteGroup() {
    if (!confirm('Удалить группу? Задачи останутся, но перестанут быть сгруппированы.')) return
    try {
      await deleteTaskGroup(groupId)
      navigate('/tasks')
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось удалить группу') })
    }
  }

  async function handleRemoveTask(taskId: number) {
    if (!confirm('Убрать задачу из группы?')) return
    try {
      await removeTaskFromGroup(groupId, taskId)
      refresh()
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось убрать задачу из группы') })
    }
  }

  if (loading) {
    return (
      <Center h={200}>
        <Loader />
      </Center>
    )
  }

  if (!group) {
    return <Alert color="red">Группа не найдена</Alert>
  }

  return (
    <Stack>
      <Group justify="space-between" align="flex-start">
        <Group gap="xs">
          <Title order={2}>{group.name}</Title>
          {isAdmin && (
            <ActionIcon variant="subtle" onClick={openRenameModal} aria-label="Переименовать">
              <IconEdit size={18} />
            </ActionIcon>
          )}
        </Group>
        {isAdmin && (
          <Button color="red" variant="subtle" leftSection={<IconTrash size={16} />} onClick={handleDeleteGroup}>
            Удалить группу
          </Button>
        )}
      </Group>

      <Card shadow="sm" radius="md">
        <Text size="sm" c="dimmed" mb="xs">
          Сводные итоги по группе
        </Text>
        <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="xs">
          <FinanceStat label="К оплате" value={group.summary.invoice_total} formatMoney={formatMoney} />
          <FinanceStat
            label="Задолженность"
            value={group.summary.debt_total}
            formatMoney={formatMoney}
            color={Number(group.summary.debt_total) > 0 ? 'red' : 'teal'}
          />
          <FinanceStat label="Расходы" value={group.summary.expenses_total} formatMoney={formatMoney} />
          <FinanceStat label="Доходы" value={group.summary.incomes_total} formatMoney={formatMoney} />
          <FinanceStat label="Зарплата" value={group.summary.salary_total} formatMoney={formatMoney} />
          <FinanceStat
            label="Прибыль"
            value={group.summary.profit_total}
            formatMoney={formatMoney}
            color={Number(group.summary.profit_total) >= 0 ? 'teal' : 'red'}
          />
        </SimpleGrid>
      </Card>

      <Table striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Клиент</Table.Th>
            <Table.Th>Задача</Table.Th>
            <Table.Th>Дата</Table.Th>
            <Table.Th>Этап</Table.Th>
            <Table.Th>К оплате</Table.Th>
            {isAdmin && <Table.Th />}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {group.tasks.map((t) => (
            <Table.Tr key={t.id} style={{ cursor: 'pointer' }}>
              <Table.Td onClick={() => navigate(`/tasks/${t.id}`)}>{t.client.name}</Table.Td>
              <Table.Td onClick={() => navigate(`/tasks/${t.id}`)}>{t.title}</Table.Td>
              <Table.Td onClick={() => navigate(`/tasks/${t.id}`)}>
                {new Date(t.created_at).toLocaleDateString('ru-RU')}
              </Table.Td>
              <Table.Td onClick={() => navigate(`/tasks/${t.id}`)}>{t.stage.name}</Table.Td>
              <Table.Td onClick={() => navigate(`/tasks/${t.id}`)}>{formatMoney(t.invoice_total)}</Table.Td>
              {isAdmin && (
                <Table.Td onClick={(e) => e.stopPropagation()}>
                  <ActionIcon variant="subtle" color="red" onClick={() => handleRemoveTask(t.id)} aria-label="Убрать из группы">
                    <IconX size={16} />
                  </ActionIcon>
                </Table.Td>
              )}
            </Table.Tr>
          ))}
          {group.tasks.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={isAdmin ? 6 : 5}>
                <Text c="dimmed" ta="center" py="md">
                  В группе пока нет задач
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>

      <Modal opened={renameOpened} onClose={closeRename} title="Переименовать группу">
        <form onSubmit={renameForm.onSubmit(handleRename)}>
          <Stack>
            <TextInput label="Название" required {...renameForm.getInputProps('name')} />
            <Button type="submit">Сохранить</Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  )
}
