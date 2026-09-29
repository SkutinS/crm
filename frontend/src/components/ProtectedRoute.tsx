import { Center, Loader } from '@mantine/core'
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({
  children,
  adminOnly = false,
  cashOnly = false,
}: {
  children: ReactNode
  adminOnly?: boolean
  cashOnly?: boolean
}) {
  const { user, loading, isAdmin, canAccessCash } = useAuth()

  if (loading) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/tasks" replace />
  if (cashOnly && !canAccessCash) return <Navigate to="/tasks" replace />

  return <>{children}</>
}
