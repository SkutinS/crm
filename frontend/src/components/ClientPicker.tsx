import { ActionIcon, Button, Group, Modal, Select, Stack, Textarea, TextInput, Tooltip } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { IconPlus } from '@tabler/icons-react'
import { useState } from 'react'
import { apiErrorMessage } from '../api/client'
import { createClient } from '../api/clients'
import type { Client } from '../api/types'

const EMPTY = { name: '', phone: '', email: '', address: '', comment: '' }

export function ClientPicker({
  label = 'Клиент',
  clients,
  value,
  onChange,
  onClientCreated,
  required,
  error,
}: {
  label?: string
  clients: Client[]
  value: string | null
  onChange: (value: string | null) => void
  onClientCreated: (client: Client) => void
  required?: boolean
  error?: React.ReactNode
}) {
  const [opened, { open, close }] = useDisclosure(false)
  const [submitting, setSubmitting] = useState(false)
  const form = useForm({ initialValues: EMPTY })

  function openCreate() {
    form.setValues(EMPTY)
    open()
  }

  async function handleSubmit(values: typeof form.values) {
    setSubmitting(true)
    try {
      const client = await createClient(values)
      onClientCreated(client)
      onChange(String(client.id))
      close()
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось создать клиента') })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Group align="flex-end" gap="xs" wrap="nowrap">
        <Select
          label={label}
          placeholder="Выберите клиента"
          data={clients.map((c) => ({ value: String(c.id), label: c.name }))}
          value={value}
          onChange={onChange}
          searchable
          required={required}
          error={error}
          style={{ flex: 1 }}
        />
        <Tooltip label="Новый клиент">
          <ActionIcon variant="light" size="lg" onClick={openCreate} mb={error ? 22 : 2} aria-label="Новый клиент">
            <IconPlus size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Modal opened={opened} onClose={close} title="Новый клиент" zIndex={1000}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput label="Название/ФИО" required {...form.getInputProps('name')} />
            <TextInput label="Телефон" {...form.getInputProps('phone')} />
            <TextInput label="Email" {...form.getInputProps('email')} />
            <TextInput label="Адрес" {...form.getInputProps('address')} />
            <Textarea label="Комментарий" {...form.getInputProps('comment')} />
            <Button type="submit" loading={submitting}>
              Создать
            </Button>
          </Stack>
        </form>
      </Modal>
    </>
  )
}
