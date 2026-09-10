import { Alert, Button, Center, Paper, PasswordInput, Stack, TextInput, Title } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { apiErrorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm({
    initialValues: { login: '', password: '' },
  })

  if (user) {
    const from = (location.state as { from?: string })?.from ?? '/tasks'
    return <Navigate to={from} replace />
  }

  async function handleSubmit(values: typeof form.values) {
    setSubmitting(true)
    setError(null)
    try {
      await login(values.login, values.password)
      navigate('/tasks')
    } catch (e) {
      setError(apiErrorMessage(e, 'Не удалось войти'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Center h="100vh" bg="var(--mantine-color-gray-0)">
      <Paper withBorder shadow="sm" p="xl" radius="md" w={360}>
        <Title order={2} mb="md" ta="center">
          CRM
        </Title>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            {error && <Alert color="red">{error}</Alert>}
            <TextInput
              label="Логин"
              required
              autoFocus
              {...form.getInputProps('login')}
            />
            <PasswordInput label="Пароль" required {...form.getInputProps('password')} />
            <Button type="submit" loading={submitting} fullWidth mt="sm">
              Войти
            </Button>
          </Stack>
        </form>
      </Paper>
    </Center>
  )
}
