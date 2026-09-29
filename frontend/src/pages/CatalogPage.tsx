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
import {
  createCostCategory,
  createIncomeCategory,
  listCostCategories,
  listIncomeCategories,
  updateCostCategory,
  updateIncomeCategory,
} from '../api/referenceCatalogs'
import type { CostCategory, IncomeCategory, PartCatalogItem, ServiceCatalogItem } from '../api/types'
import { CatalogTreeEditor } from '../components/CatalogTreeEditor'
import { FlatCatalogEditor } from '../components/FlatCatalogEditor'

export function CatalogPage() {
  const [services, setServices] = useState<ServiceCatalogItem[]>([])
  const [parts, setParts] = useState<PartCatalogItem[]>([])
  const [costCategories, setCostCategories] = useState<CostCategory[]>([])
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([])

  function refreshServices() {
    return listServiceCatalog().then(setServices)
  }
  function refreshParts() {
    return listPartCatalog().then(setParts)
  }
  function refreshCostCategories() {
    return listCostCategories().then(setCostCategories)
  }
  function refreshIncomeCategories() {
    return listIncomeCategories().then(setIncomeCategories)
  }

  useEffect(() => {
    refreshServices()
    refreshParts()
    refreshCostCategories()
    refreshIncomeCategories()
  }, [])

  return (
    <Stack>
      <Title order={2}>Справочники</Title>

      <Tabs defaultValue="services">
        <Tabs.List>
          <Tabs.Tab value="services">Услуги</Tabs.Tab>
          <Tabs.Tab value="parts">Запчасти</Tabs.Tab>
          <Tabs.Tab value="cost-categories">Статьи затрат</Tabs.Tab>
          <Tabs.Tab value="income-categories">Статьи доходов</Tabs.Tab>
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

        <Tabs.Panel value="cost-categories" pt="md">
          <FlatCatalogEditor
            items={costCategories}
            onCreate={createCostCategory}
            onUpdate={updateCostCategory}
            refresh={refreshCostCategories}
          />
        </Tabs.Panel>

        <Tabs.Panel value="income-categories" pt="md">
          <FlatCatalogEditor
            items={incomeCategories}
            onCreate={createIncomeCategory}
            onUpdate={updateIncomeCategory}
            refresh={refreshIncomeCategories}
          />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}
