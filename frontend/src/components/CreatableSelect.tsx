import { Select } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useState } from 'react'
import { apiErrorMessage } from '../api/client'

const CREATE_VALUE = '__create__'

export interface SelectOption {
  value: string
  label: string
}

/** A Select that can create a new record right from the dropdown, without
 * leaving the page: typing a name that doesn't match anything appends a
 * "+ Создать «name»" item at the bottom of the list — picking it calls
 * `onCreate`, then selects and reports the new record via `onCreated`.
 *
 * `canCreate` gates the create item entirely (pass the caller's own write
 * permission for the underlying catalog — this component has no opinion
 * on permissions, it just shows/hides the affordance).
 */
export function CreatableSelect<T>({
  data,
  value = null,
  onChange,
  onCreate,
  onCreated,
  canCreate = false,
  createLabel,
  label,
  placeholder,
  required,
  clearable,
  searchable = true,
  disabled,
  size,
  w,
  error,
}: {
  data: SelectOption[]
  value?: string | null
  onChange: (value: string | null) => void
  onCreate: (name: string) => Promise<{ option: SelectOption; record: T }>
  onCreated?: (record: T) => void
  canCreate?: boolean
  createLabel?: (query: string) => string
  label?: string
  placeholder?: string
  required?: boolean
  clearable?: boolean
  searchable?: boolean
  disabled?: boolean
  size?: string
  w?: number | string
  error?: React.ReactNode
}) {
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)

  const trimmed = search.trim()
  const hasExactMatch = data.some((d) => d.label.toLowerCase() === trimmed.toLowerCase())
  const options =
    canCreate && trimmed && !hasExactMatch
      ? [...data, { value: CREATE_VALUE, label: createLabel ? createLabel(trimmed) : `+ Создать «${trimmed}»` }]
      : data

  async function handleChange(v: string | null) {
    if (v !== CREATE_VALUE) {
      onChange(v)
      return
    }
    if (!trimmed) return
    setCreating(true)
    try {
      const { option, record } = await onCreate(trimmed)
      onCreated?.(record)
      onChange(option.value)
      setSearch('')
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось создать') })
    } finally {
      setCreating(false)
    }
  }

  return (
    <Select
      label={label}
      placeholder={placeholder}
      data={options}
      value={value}
      onChange={handleChange}
      searchable={searchable}
      searchValue={search}
      onSearchChange={setSearch}
      required={required}
      clearable={clearable}
      disabled={disabled || creating}
      size={size}
      w={w}
      error={error}
    />
  )
}
