import { Select } from '@mantine/core'
import { flattenTree } from '../utils/catalogTree'

interface CatalogPickerProps<T extends { id: number; parent_id: number | null; name: string }> {
  items: T[]
  value: number | null
  onChange: (id: number | null, item: T | null) => void
  placeholder?: string
}

export function CatalogPicker<T extends { id: number; parent_id: number | null; name: string }>({
  items,
  value,
  onChange,
  placeholder = 'Выбрать из справочника…',
}: CatalogPickerProps<T>) {
  const rows = flattenTree(items)
  const data = rows.map((r) => ({ value: String(r.item.id), label: r.path }))

  return (
    <Select
      label="Из справочника"
      placeholder={placeholder}
      data={data}
      value={value !== null ? String(value) : null}
      onChange={(v) => {
        if (!v) {
          onChange(null, null)
          return
        }
        const row = rows.find((r) => r.item.id === Number(v))
        onChange(Number(v), row?.item ?? null)
      }}
      searchable
      clearable
    />
  )
}
