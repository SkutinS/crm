import { Stack, Tabs, Title } from '@mantine/core'
import { useEffect, useState } from 'react'
import {
  createPartCatalogItem,
  createServiceCatalogItem,
  deletePartCatalogItem,
  deleteServiceCatalogItem,
  listPartCatalog,
  listServiceCatalog,
  updatePartCatalogItem,
  updateServiceCatalogItem,
} from '../api/catalog'
import type { PartCatalogItem, ServiceCatalogItem } from '../api/types'
import { CatalogTreeEditor } from '../components/CatalogTreeEditor'

export function CatalogPage() {
  const [services, setServices] = useState<ServiceCatalogItem[]>([])
  const [parts, setParts] = useState<PartCatalogItem[]>([])

  function refreshServices() {
    return listServiceCatalog().then(setServices)
  }
  function refreshParts() {
    return listPartCatalog().then(setParts)
  }

  useEffect(() => {
    refreshServices()
    refreshParts()
  }, [])

  return (
    <Stack>
      <Title order={2}>Справочники</Title>

      <Tabs defaultValue="services">
        <Tabs.List>
          <Tabs.Tab value="services">Услуги</Tabs.Tab>
          <Tabs.Tab value="parts">Запчасти</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="services" pt="md">
          <CatalogTreeEditor
            items={services}
            priceFields={[{ key: 'default_price', label: 'Цена' }]}
            onCreate={(p) => createServiceCatalogItem(p as never)}
            onUpdate={(id, p) => updateServiceCatalogItem(id, p as never)}
            onDelete={deleteServiceCatalogItem}
            refresh={refreshServices}
          />
        </Tabs.Panel>

        <Tabs.Panel value="parts" pt="md">
          <CatalogTreeEditor
            items={parts}
            priceFields={[
              { key: 'default_sale_price', label: 'Цена продажи' },
              { key: 'default_purchase_price', label: 'Цена закупки' },
            ]}
            onCreate={(p) => createPartCatalogItem(p as never)}
            onUpdate={(id, p) => updatePartCatalogItem(id, p as never)}
            onDelete={deletePartCatalogItem}
            refresh={refreshParts}
          />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}
