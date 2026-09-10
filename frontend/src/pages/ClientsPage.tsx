import { ActionIcon, Button, Group, Modal, Stack, Table, Text, Textarea, TextInput, Title } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { IconEdit, IconPlus, IconTrash } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { type ClientPayload, createClient, deleteClient, listClients, updateClient } from '../api/clients'
import { apiErrorMessage } from '../api/client'
import type { Client } from '../api/types'

const EMPTY: ClientPayload = { name: '', phone: '', email: '', address: '', comment: '' }

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [opened, { open, close }] = useDisclosure(false)
  const [editing, setEditing] = useState<Client | null>(null)

  const form = useForm<ClientPayload>({ initialValues: EMPTY })

  function refresh() {
    setLoading(true)
    listClients()
      .then(setClients)
      .finally(() => setLoading(false))
  }

  useEffect(refresh, [])

  function openCreate() {
    setEditing(null)
    form.setValues(EMPTY)
    open()
  }

  function openEdit(client: Client) {
    setEditing(client)
    form.setValues({
      name: client.name,
      phone: client.phone ?? '',
      email: client.email ?? '',
      address: client.address ?? '',
      comment: client.comment ?? '',
    })
    open()
  }

  async function handleSubmit(values: ClientPayload) {
    try {
      if (editing) {
        await updateClient(editing.id, values)
      } else {
        await createClient(values)
      }
      close()
      refresh()
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось сохранить клиента') })
    }
  }

  async function handleDelete(client: Client) {
    if (!confirm(`Удалить клиента «${client.name}»?`)) return
    try {
      await deleteClient(client.id)
      refresh()
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось удалить клиента') })
    }
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Клиенты</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
          Новый клиент
        </Button>
      </Group>

      <Table striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Название/ФИО</Table.Th>
            <Table.Th>Телефон</Table.Th>
            <Table.Th>Email</Table.Th>
            <Table.Th>Адрес</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {clients.map((c) => (
            <Table.Tr key={c.id}>
              <Table.Td>{c.name}</Table.Td>
              <Table.Td>{c.phone}</Table.Td>
              <Table.Td>{c.email}</Table.Td>
              <Table.Td>{c.address}</Table.Td>
              <Table.Td>
                <Group gap="xs" justify="flex-end">
                  <ActionIcon variant="subtle" onClick={() => openEdit(c)}>
                    <IconEdit size={16} />
                  </ActionIcon>
                  <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(c)}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
          {!loading && clients.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={5}>
                <Text c="dimmed" ta="center" py="md">
                  Клиентов пока нет
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>

      <Modal opened={opened} onClose={close} title={editing ? 'Редактировать клиента' : 'Новый клиент'}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput label="Название/ФИО" required {...form.getInputProps('name')} />
            <TextInput label="Телефон" {...form.getInputProps('phone')} />
            <TextInput label="Email" {...form.getInputProps('email')} />
            <TextInput label="Адрес" {...form.getInputProps('address')} />
            <Textarea label="Комментарий" {...form.getInputProps('comment')} />
            <Button type="submit" mt="sm">
              Сохранить
            </Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  )
}
