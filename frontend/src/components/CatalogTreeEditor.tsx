import { ActionIcon, Button, Group, Modal, NumberInput, Select, Stack, Text, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { IconEdit, IconPlus, IconTrash } from '@tabler/icons-react'
import { useState, type FocusEvent } from 'react'
import { apiErrorMessage } from '../api/client'
import { descendantIds, flattenTree } from '../utils/catalogTree'

// Mantine's NumberInput keeps the initial 0 in place and inserts typed
// digits next to it instead of replacing it. Selecting the whole value on
// focus makes the first keystroke overwrite it, like a normal spreadsheet
// cell.
function selectOnFocus(e: FocusEvent<HTMLInputElement>) {
  e.currentTarget.select()
}

interface CatalogNode {
  id: number
  parent_id: number | null
  name: string
}

interface PriceField {
  key: string
  label: string
}

export function CatalogTreeEditor<T extends CatalogNode>({
  items,
  priceFields,
  onCreate,
  onUpdate,
  onDelete,
  refresh,
}: {
  items: T[]
  priceFields: PriceField[]
  onCreate: (payload: Record<string, unknown>) => Promise<unknown>
  onUpdate: (id: number, payload: Record<string, unknown>) => Promise<unknown>
  onDelete: (id: number) => Promise<unknown>
  refresh: () => Promise<void> | void
}) {
  const [opened, { open, close }] = useDisclosure(false)
  const [editing, setEditing] = useState<T | null>(null)

  const emptyValues = (): Record<string, string | number> => ({
    name: '',
    parent_id: '',
    ...Object.fromEntries(priceFields.map((f) => [f.key, 0])),
  })

  const form = useForm<Record<string, string | number>>({ initialValues: emptyValues() })

  const rows = flattenTree(items)

  function openCreate(parentId: number | null) {
    setEditing(null)
    form.setValues({ ...emptyValues(), parent_id: parentId !== null ? String(parentId) : '' })
    open()
  }

  function openEdit(node: T) {
    setEditing(node)
    const raw = node as unknown as Record<string, unknown>
    form.setValues({
      name: node.name,
      parent_id: node.parent_id !== null ? String(node.parent_id) : '',
      ...Object.fromEntries(priceFields.map((f) => [f.key, raw[f.key] != null ? Number(raw[f.key]) : 0])),
    })
    open()
  }

  async function handleSubmit(values: typeof form.values) {
    const payload: Record<string, unknown> = {
      name: values.name,
      parent_id: values.parent_id ? Number(values.parent_id) : null,
    }
    for (const f of priceFields) {
      const raw = values[f.key]
      payload[f.key] = raw === '' || raw === null || raw === undefined ? null : String(raw)
    }
    try {
      if (editing) await onUpdate(editing.id, payload)
      else await onCreate(payload)
      close()
      await refresh()
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось сохранить') })
    }
  }

  async function handleDelete(node: T) {
    if (!confirm(`Удалить «${node.name}»?`)) return
    try {
      await onDelete(node.id)
      await refresh()
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось удалить') })
    }
  }

  const excludedParentIds = editing ? descendantIds(items, editing.id) : new Set<number>()
  const parentOptions = rows
    .filter((r) => !excludedParentIds.has(r.item.id))
    .map((r) => ({ value: String(r.item.id), label: r.path }))

  return (
    <Stack>
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          {items.length === 0 ? 'Пока пусто' : `Позиций: ${items.length}`}
        </Text>
        <Button size="xs" leftSection={<IconPlus size={14} />} onClick={() => openCreate(null)}>
          Добавить в корень
        </Button>
      </Group>

      <Stack gap={4}>
        {rows.map(({ item, depth }) => (
          <Group key={item.id} justify="space-between" wrap="nowrap" pl={depth * 20}>
            <Group gap="xs" wrap="nowrap">
              <Text size="sm">{item.name}</Text>
              {priceFields.map((f) => {
                const v = (item as unknown as Record<string, unknown>)[f.key]
                return v != null ? (
                  <Text key={f.key} size="xs" c="dimmed">
                    {f.label}: {Number(v).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                  </Text>
                ) : null
              })}
            </Group>
            <Group gap={4}>
              <ActionIcon size="sm" variant="subtle" onClick={() => openCreate(item.id)} title="Добавить вложенную">
                <IconPlus size={14} />
              </ActionIcon>
              <ActionIcon size="sm" variant="subtle" onClick={() => openEdit(item)}>
                <IconEdit size={14} />
              </ActionIcon>
              <ActionIcon size="sm" variant="subtle" color="red" onClick={() => handleDelete(item)}>
                <IconTrash size={14} />
              </ActionIcon>
            </Group>
          </Group>
        ))}
      </Stack>

      <Modal opened={opened} onClose={close} title={editing ? 'Редактировать позицию' : 'Новая позиция'}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput label="Название" required {...form.getInputProps('name')} />
            <Select
              label="Родительская категория"
              placeholder="Без родителя (корень)"
              data={parentOptions}
              clearable
              searchable
              {...form.getInputProps('parent_id')}
            />
            {priceFields.map((f) => (
              <NumberInput
                key={f.key}
                label={f.label}
                min={0}
                decimalScale={2}
                onFocus={selectOnFocus}
                {...form.getInputProps(f.key)}
              />
            ))}
            <Button type="submit">Сохранить</Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  )
}
