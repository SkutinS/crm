import { flattenTree } from '../utils/catalogTree'
import { CreatableSelect } from './CreatableSelect'

interface CatalogPickerProps<T extends { id: number; parent_id: number | null; name: string }> {
  items: T[]
  value: number | null
  onChange: (id: number | null, item: T | null) => void
  placeholder?: string
  canCreate?: boolean
  onCreate?: (name: string) => Promise<T>
  onCreated?: (item: T) => void
}

export function CatalogPicker<T extends { id: number; parent_id: number | null; name: string }>({
  items,
  value,
  onChange,
  placeholder = 'Выбрать из справочника…',
  canCreate = false,
  onCreate,
  onCreated,
}: CatalogPickerProps<T>) {
  const rows = flattenTree(items)
  const data = rows.map((r) => ({ value: String(r.item.id), label: r.path }))

  return (
    <CreatableSelect
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
      canCreate={canCreate && !!onCreate}
      onCreate={async (name) => {
        const item = await onCreate!(name)
        return { option: { value: String(item.id), label: item.name }, record: item }
      }}
      onCreated={(item) => {
        onCreated?.(item)
        onChange(item.id, item)
      }}
      searchable
      clearable
    />
  )
}
