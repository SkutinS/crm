import { ActionIcon, Badge, Button, Group, Modal, Stack, Switch, Text, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { IconEdit, IconPlus } from '@tabler/icons-react'
import { apiErrorMessage } from '../api/client'

interface CategoryRow {
  id: number
  name: string
  is_active: boolean
}

/** Flat name+is_active reference list (cost/income categories) — same
 * create/edit-modal shape as CatalogTreeEditor, minus the tree/price
 * machinery those don't need. No delete: an unwanted category is
 * deactivated instead, same convention as User.is_active.
 */
export function FlatCatalogEditor<T extends CategoryRow>({
  items,
  onCreate,
  onUpdate,
  refresh,
}: {
  items: T[]
  onCreate: (payload: { name: string; is_active?: boolean }) => Promise<unknown>
  onUpdate: (id: number, payload: Partial<{ name: string; is_active: boolean }>) => Promise<unknown>
  refresh: () => Promise<void> | void
}) {
  const [opened, { open, close }] = useDisclosure(false)
  const form = useForm({ initialValues: { id: null as number | null, name: '', is_active: true } })

  function openCreate() {
    form.setValues({ id: null, name: '', is_active: true })
    open()
  }

  function openEdit(item: T) {
    form.setValues({ id: item.id, name: item.name, is_active: item.is_active })
    open()
  }

  async function handleSubmit(values: typeof form.values) {
    try {
      if (values.id !== null) await onUpdate(values.id, { name: values.name, is_active: values.is_active })
      else await onCreate({ name: values.name, is_active: values.is_active })
      close()
      await refresh()
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось сохранить') })
    }
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          {items.length === 0 ? 'Пока пусто' : `Позиций: ${items.length}`}
        </Text>
        <Button size="xs" leftSection={<IconPlus size={14} />} onClick={openCreate}>
          Добавить
        </Button>
      </Group>

      <Stack gap={4}>
        {items.map((item) => (
          <Group key={item.id} justify="space-between" wrap="nowrap">
            <Group gap="xs" wrap="nowrap">
              <Text size="sm">{item.name}</Text>
              <Badge color={item.is_active ? 'green' : 'gray'} variant="light" size="sm">
                {item.is_active ? 'активна' : 'неактивна'}
              </Badge>
            </Group>
            <ActionIcon size="sm" variant="subtle" onClick={() => openEdit(item)}>
              <IconEdit size={14} />
            </ActionIcon>
          </Group>
        ))}
      </Stack>

      <Modal opened={opened} onClose={close} title={form.values.id !== null ? 'Редактировать позицию' : 'Новая позиция'}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput label="Название" required {...form.getInputProps('name')} />
            <Switch label="Активна" {...form.getInputProps('is_active', { type: 'checkbox' })} />
            <Button type="submit">Сохранить</Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  )
}
