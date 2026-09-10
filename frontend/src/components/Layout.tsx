import { AppShell, Burger, Group, NavLink as MantineNavLink, Text, Button } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  IconBooks,
  IconCalendar,
  IconChecklist,
  IconLogout,
  IconSettings,
  IconUsers,
  IconUsersGroup,
} from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function Layout({ children }: { children: ReactNode }) {
  const [opened, { toggle }] = useDisclosure()
  const { user, logout, isAdmin } = useAuth()
  const location = useLocation()

  const links = [
    { to: '/tasks', label: 'Задачи', icon: IconChecklist },
    { to: '/calendar', label: 'Календарь', icon: IconCalendar },
    ...(isAdmin ? [{ to: '/clients', label: 'Клиенты', icon: IconUsersGroup }] : []),
    ...(isAdmin ? [{ to: '/users', label: 'Сотрудники', icon: IconUsers }] : []),
    ...(isAdmin ? [{ to: '/catalog', label: 'Справочники', icon: IconBooks }] : []),
    { to: '/settings', label: 'Настройки', icon: IconSettings },
  ]

  return (
    <AppShell header={{ height: 60 }} navbar={{ width: 220, breakpoint: 'sm', collapsed: { mobile: !opened } }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text fw={700} size="lg">
              CRM
            </Text>
          </Group>
          <Group>
            <Text size="sm" c="dimmed">
              {user?.full_name} · {user?.role === 'admin' ? 'администратор' : 'сотрудник'}
            </Text>
            <Button variant="subtle" size="xs" leftSection={<IconLogout size={16} />} onClick={logout}>
              Выйти
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        {links.map((link) => (
          <MantineNavLink
            key={link.to}
            component={NavLink}
            to={link.to}
            label={link.label}
            leftSection={<link.icon size={18} />}
            active={location.pathname.startsWith(link.to)}
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Main
        style={{ background: 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))' }}
      >
        {children}
      </AppShell.Main>
    </AppShell>
  )
}
