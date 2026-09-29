import { createClient } from '../api/clients'
import type { Client } from '../api/types'
import { CreatableSelect } from './CreatableSelect'

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
  return (
    <CreatableSelect
      label={label}
      placeholder="Выберите клиента"
      data={clients.map((c) => ({ value: String(c.id), label: c.name }))}
      value={value}
      onChange={onChange}
      searchable
      required={required}
      error={error}
      canCreate
      onCreate={async (name) => {
        const client = await createClient({ name })
        return { option: { value: String(client.id), label: client.name }, record: client }
      }}
      onCreated={onClientCreated}
    />
  )
}
