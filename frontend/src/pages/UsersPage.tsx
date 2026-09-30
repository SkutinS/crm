import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  PasswordInput,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { IconEdit, IconPlus, IconTrash } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { apiErrorMessage } from '../api/client'
import type { User, UserRole } from '../api/types'
import { type UserPayload, createUser, deleteUser, listUsers, updateUser } from '../api/users'
import { roleLabel } from '../utils/roleLabel'
import { selectOnFocus } from '../utils/selectOnFocus'

interface FormValues {
  full_name: string
  login: string
  role: UserRole
  rate_type: 'hourly' | 'fixed'
  rate_amount: number
  is_active: boolean
  can_access_cash: boolean
  password: string
}

const EMPTY: FormValues = {
  full_name: '',
  login: '',
  role: 'employee',
  rate_type: 'hourly',
  rate_amount: 0,
  is_active: true,
  can_access_cash: false,
  password: '',
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [opened, { open, close }] = useDisclosure(false)
  const [editing, setEditing] = useState<User | null>(null)

  const form = useForm<FormValues>({ initialValues: EMPTY })

  function refresh() {
    setLoading(true)
    listUsers()
      .then(setUsers)
      .finally(() => setLoading(false))
  }

  useEffect(refresh, [])

  function openCreate() {
    setEditing(null)
    form.setValues(EMPTY)
    open()
  }

  function openEdit(user: User) {
    setEditing(user)
    form.setValues({
      full_name: user.full_name,
      login: user.login,
      role: user.role,
      rate_type: user.rate_type,
      rate_amount: Number(user.rate_amount),
      is_active: user.is_active,
      can_access_cash: user.can_access_cash,
      password: '',
    })
    open()
  }

  async function handleSubmit(values: FormValues) {
    const payload: UserPayload = {
      full_name: values.full_name,
      login: values.login,
      role: values.role,
      rate_type: values.rate_type,
      rate_amount: String(values.rate_amount),
      is_active: values.is_active,
      can_access_cash: values.can_access_cash,
    }
    if (values.password) payload.password = values.password

    try {
      if (editing) {
        await updateUser(editing.id, payload)
      } else {
        await createUser(payload)
      }
      close()
      refresh()
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось сохранить сотрудника') })
    }
  }

  async function handleDelete(user: User) {
    if (!confirm(`Деактивировать сотрудника «${user.full_name}»?`)) return
    try {
      await deleteUser(user.id)
      refresh()
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось удалить сотрудника') })
    }
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Сотрудники</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
          Новый сотрудник
        </Button>
      </Group>

      <Table striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>ФИО</Table.Th>
            <Table.Th>Логин</Table.Th>
            <Table.Th>Роль</Table.Th>
            <Table.Th>Ставка</Table.Th>
            <Table.Th>Статус</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {users.map((u) => (
            <Table.Tr key={u.id}>
              <Table.Td>{u.full_name}</Table.Td>
              <Table.Td>{u.login}</Table.Td>
              <Table.Td>{roleLabel(u.role, true)}</Table.Td>
              <Table.Td>
                {u.rate_amount} ₽ {u.rate_type === 'hourly' ? '/ч' : '(фикс.)'}
              </Table.Td>
              <Table.Td>
                <Group gap={4}>
                  <Badge color={u.is_active ? 'green' : 'gray'} variant="light">
                    {u.is_active ? 'активен' : 'неактивен'}
                  </Badge>
                  {u.role === 'employee' && u.can_access_cash && (
                    <Badge color="blue" variant="light">
                      касса
                    </Badge>
                  )}
                </Group>
              </Table.Td>
              <Table.Td>
                <Group gap="xs" justify="flex-end">
                  <ActionIcon variant="subtle" onClick={() => openEdit(u)}>
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(u)}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
          {!loading && users.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={6}>
                <Text c="dimmed" ta="center" py="md">
                  Сотрудников пока нет
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>

      <Modal opened={opened} onClose={close} title={editing ? 'Редактировать сотрудника' : 'Новый сотрудник'}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput label="ФИО" required {...form.getInputProps('full_name')} />
            <TextInput label="Логин" required {...form.getInputProps('login')} />
            <PasswordInput
              label={editing ? 'Новый пароль (оставьте пустым, чтобы не менять)' : 'Пароль'}
              required={!editing}
              {...form.getInputProps('password')}
            />
            <Select
              label="Роль"
              data={[
                { value: 'employee', label: 'Сотрудник' },
                { value: 'senior_admin', label: 'Старший администратор' },
                { value: 'admin', label: 'Администратор' },
              ]}
              allowDeselect={false}
              {...form.getInputProps('role')}
            />
            <Select
              label="Тип ставки"
              data={[
                { value: 'hourly', label: 'Почасовая' },
                { value: 'fixed', label: 'Фиксированная' },
              ]}
              allowDeselect={false}
              {...form.getInputProps('rate_type')}
            />
            <NumberInput
              label={form.values.rate_type === 'hourly' ? 'Ставка, ₽/час' : 'Фиксированная ставка, ₽'}
              min={0}
              decimalScale={2}
              onFocus={selectOnFocus}
              {...form.getInputProps('rate_amount')}
            />
            <Switch label="Активен" {...form.getInputProps('is_active', { type: 'checkbox' })} />
            {form.values.role === 'employee' && (
              <Switch
                label="Доступ к кассе"
                description="Может создавать и видеть кассовые документы, не будучи администратором"
                {...form.getInputProps('can_access_cash', { type: 'checkbox' })}
              />
            )}
            <Button type="submit" mt="sm">
              Сохранить
            </Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  )
}
