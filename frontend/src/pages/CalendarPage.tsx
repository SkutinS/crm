import { Badge, Button, Group, Modal, Select, Stack, Text, TextInput, Title, Tooltip } from '@mantine/core'
import { DateInput, DateTimePicker } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { IconAlertTriangle } from '@tabler/icons-react'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiErrorMessage } from '../api/client'
import { listCalendarWorks } from '../api/calendar'
import { listClients } from '../api/clients'
import { addWork, createTask } from '../api/tasks'
import type { CalendarWorkItem, Client, User } from '../api/types'
import { listUsers } from '../api/users'
import { ClientPicker } from '../components/ClientPicker'
import { useAuth } from '../context/AuthContext'

const PX_PER_HOUR = 56
const MIN_RANGE_HOURS = 10
const DEFAULT_RANGE = { startHour: 8, endHour: 20 }
const SNAP_MINUTES = 15
const CLICK_THRESHOLD_PX = 6

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

interface LaidOutWork {
  work: CalendarWorkItem
  column: number
  totalColumns: number
}

/** Groups a day's works into overlap clusters and assigns each a lane
 * (column) within its cluster, so overlapping works render side by side
 * instead of on top of each other — the same approach week-view calendars
 * (Google Calendar, Outlook) use.
 */
function layoutDay(works: CalendarWorkItem[]): LaidOutWork[] {
  const sorted = [...works].sort((a, b) => a.planned_start.localeCompare(b.planned_start))
  const result: LaidOutWork[] = []

  let cluster: CalendarWorkItem[] = []
  let clusterEnd: string | null = null

  function flushCluster() {
    if (cluster.length === 0) return
    const columnEnds: string[] = []
    const assigned: { work: CalendarWorkItem; column: number }[] = []
    for (const w of cluster) {
      let col = columnEnds.findIndex((end) => end <= w.planned_start)
      if (col === -1) {
        col = columnEnds.length
        columnEnds.push(w.planned_end)
      } else {
        columnEnds[col] = w.planned_end
      }
      assigned.push({ work: w, column: col })
    }
    const totalColumns = columnEnds.length
    for (const a of assigned) result.push({ work: a.work, column: a.column, totalColumns })
    cluster = []
    clusterEnd = null
  }

  for (const w of sorted) {
    if (clusterEnd !== null && w.planned_start < clusterEnd) {
      cluster.push(w)
      if (w.planned_end > clusterEnd) clusterEnd = w.planned_end
    } else {
      flushCluster()
      cluster = [w]
      clusterEnd = w.planned_end
    }
  }
  flushCluster()

  return result
}

interface PendingRange {
  start: Date
  end: Date
}

export function CalendarPage() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [weekStart, setWeekStart] = useState<Date>(dayjs().startOf('week').toDate())
  const [users, setUsers] = useState<User[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [works, setWorks] = useState<CalendarWorkItem[]>([])
  const [loading, setLoading] = useState(true)

  const weekEnd = useMemo(() => dayjs(weekStart).add(7, 'day').toDate(), [weekStart])
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => dayjs(weekStart).add(i, 'day')), [weekStart])

  useEffect(() => {
    if (isAdmin) {
      listUsers().then(setUsers)
      listClients().then(setClients)
    }
  }, [isAdmin])

  useEffect(() => {
    setLoading(true)
    listCalendarWorks({
      start: weekStart.toISOString(),
      end: weekEnd.toISOString(),
      employee_id: employeeId ? Number(employeeId) : undefined,
    })
      .then(setWorks)
      .finally(() => setLoading(false))
  }, [weekStart, weekEnd, employeeId])

  const range = useMemo(() => {
    if (works.length === 0) return DEFAULT_RANGE
    let minHour = DEFAULT_RANGE.startHour
    let maxHour = DEFAULT_RANGE.endHour
    for (const w of works) {
      const s = dayjs(w.planned_start)
      const e = dayjs(w.planned_end)
      minHour = Math.min(minHour, s.hour())
      maxHour = Math.max(maxHour, e.hour() + (e.minute() > 0 ? 1 : 0))
    }
    if (maxHour - minHour < MIN_RANGE_HOURS) maxHour = minHour + MIN_RANGE_HOURS
    return { startHour: Math.max(0, minHour), endHour: Math.min(24, maxHour) }
  }, [works])

  const rangeHours = range.endHour - range.startHour
  const gridHeight = rangeHours * PX_PER_HOUR
  const hourMarks = Array.from({ length: rangeHours + 1 }, (_, i) => range.startHour + i)

  const worksByDay = useMemo(() => {
    const map = new Map<string, CalendarWorkItem[]>()
    for (const day of days) map.set(day.format('YYYY-MM-DD'), [])
    for (const w of works) {
      const key = dayjs(w.planned_start).format('YYYY-MM-DD')
      if (map.has(key)) map.get(key)!.push(w)
    }
    return map
  }, [works, days])

  function timeToPx(iso: string, day: Dayjs): number {
    const t = dayjs(iso)
    const hours = t.diff(day.hour(range.startHour).minute(0).second(0), 'minute') / 60
    return Math.max(0, Math.min(rangeHours, hours)) * PX_PER_HOUR
  }

  function pxToTime(day: Dayjs, y: number): Dayjs {
    const rawMinutes = (y / PX_PER_HOUR) * 60
    const snapped = Math.round(rawMinutes / SNAP_MINUTES) * SNAP_MINUTES
    return day.hour(range.startHour).minute(0).second(0).millisecond(0).add(snapped, 'minute')
  }

  // ---- Drag-to-create-task ----
  // dragRef holds the non-reactive per-drag data (which day/container the
  // drag started in); `selection` mirrors just the visible box and is the
  // only thing that changes on every mousemove, so the window listener
  // effect (keyed on `isSelecting`) doesn't get torn down and rebuilt on
  // every pixel of movement.
  const dragRef = useRef<{ day: Dayjs; dayKey: string; container: HTMLDivElement; startY: number } | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [selection, setSelection] = useState<{ dayKey: string; top: number; bottom: number } | null>(null)
  const [pendingRange, setPendingRange] = useState<PendingRange | null>(null)

  function handleGridMouseDown(e: React.MouseEvent<HTMLDivElement>, day: Dayjs, dayKey: string) {
    if (!isAdmin) return
    const container = e.currentTarget
    const rect = container.getBoundingClientRect()
    const y = clamp(e.clientY - rect.top, 0, gridHeight)
    dragRef.current = { day, dayKey, container, startY: y }
    setSelection({ dayKey, top: y, bottom: y })
    setIsSelecting(true)
  }

  useEffect(() => {
    if (!isSelecting) return

    function onMove(e: MouseEvent) {
      const info = dragRef.current
      if (!info) return
      const rect = info.container.getBoundingClientRect()
      const y = clamp(e.clientY - rect.top, 0, gridHeight)
      setSelection({ dayKey: info.dayKey, top: Math.min(info.startY, y), bottom: Math.max(info.startY, y) })
    }

    function onUp(e: MouseEvent) {
      const info = dragRef.current
      if (info) {
        const rect = info.container.getBoundingClientRect()
        const endY = clamp(e.clientY - rect.top, 0, gridHeight)
        let top = Math.min(info.startY, endY)
        let bottom = Math.max(info.startY, endY)
        if (bottom - top < CLICK_THRESHOLD_PX) {
          // a plain click (no real drag) — default to a 1-hour slot
          bottom = Math.min(gridHeight, top + PX_PER_HOUR)
          top = Math.max(0, bottom - PX_PER_HOUR)
        }
        setPendingRange({ start: pxToTime(info.day, top).toDate(), end: pxToTime(info.day, bottom).toDate() })
      }
      dragRef.current = null
      setSelection(null)
      setIsSelecting(false)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSelecting, gridHeight])

  const hasConflicts = works.some((w) => w.has_conflict)
  const today = dayjs().format('YYYY-MM-DD')

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Календарь работ</Title>
        <Group>
          <Button variant="light" onClick={() => setWeekStart(dayjs(weekStart).subtract(7, 'day').toDate())}>
            ← Пред. неделя
          </Button>
          <DateInput
            value={weekStart}
            onChange={(v) => v && setWeekStart(dayjs(v).startOf('week').toDate())}
            valueFormat="DD.MM.YYYY"
            w={160}
          />
          <Button variant="light" onClick={() => setWeekStart(dayjs(weekStart).add(7, 'day').toDate())}>
            След. неделя →
          </Button>
        </Group>
      </Group>

      {isAdmin && (
        <Select
          label="Сотрудник"
          placeholder="Все сотрудники"
          data={users.map((u) => ({ value: String(u.id), label: u.full_name }))}
          value={employeeId}
          onChange={setEmployeeId}
          clearable
          searchable
          w={260}
        />
      )}

      {hasConflicts && (
        <Group gap="xs" c="orange">
          <IconAlertTriangle size={16} />
          <Text size="sm">У некоторых сотрудников есть пересекающиеся по времени работы — обведены оранжевым.</Text>
        </Group>
      )}

      {isAdmin && (
        <Text size="xs" c="dimmed">
          Выделите время в свободной ячейке дня, чтобы создать новую задачу с работой на это время.
        </Text>
      )}

      <div style={{ display: 'flex', border: '1px solid var(--mantine-color-gray-3)', borderRadius: 8, overflow: 'hidden' }}>
        {/* time axis */}
        <div style={{ width: 56, flexShrink: 0, borderRight: '1px solid var(--mantine-color-gray-3)' }}>
          <div style={{ height: 52, borderBottom: '1px solid var(--mantine-color-gray-3)' }} />
          <div style={{ position: 'relative', height: gridHeight }}>
            {hourMarks.map((h) => (
              <Text
                key={h}
                size="xs"
                c="dimmed"
                style={{ position: 'absolute', top: (h - range.startHour) * PX_PER_HOUR - 7, right: 6 }}
              >
                {String(h).padStart(2, '0')}:00
              </Text>
            ))}
          </div>
        </div>

        {/* day columns */}
        <div style={{ display: 'flex', flex: 1, overflowX: 'auto', userSelect: isSelecting ? 'none' : undefined }}>
          {days.map((day) => {
            const key = day.format('YYYY-MM-DD')
            const dayWorks = worksByDay.get(key) ?? []
            const laidOut = layoutDay(dayWorks)
            const isToday = key === today
            const daySelection = selection?.dayKey === key ? selection : null

            return (
              <div
                key={key}
                style={{
                  flex: '1 0 130px',
                  minWidth: 130,
                  borderRight: '1px solid var(--mantine-color-gray-2)',
                  background: isToday ? 'var(--mantine-color-blue-0)' : undefined,
                }}
              >
                <div
                  style={{
                    height: 52,
                    borderBottom: '1px solid var(--mantine-color-gray-3)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text size="xs" c="dimmed" tt="capitalize">
                    {day.format('dddd')}
                  </Text>
                  <Text size="sm" fw={isToday ? 700 : 500}>
                    {day.format('DD.MM')}
                  </Text>
                </div>

                <div
                  style={{ position: 'relative', height: gridHeight, cursor: isAdmin ? 'crosshair' : 'default' }}
                  onMouseDown={(e) => handleGridMouseDown(e, day, key)}
                >
                  {hourMarks.slice(0, -1).map((h) => (
                    <div
                      key={h}
                      style={{
                        position: 'absolute',
                        top: (h - range.startHour) * PX_PER_HOUR,
                        left: 0,
                        right: 0,
                        borderTop: '1px solid var(--mantine-color-gray-1)',
                      }}
                    />
                  ))}

                  {daySelection && (
                    <div
                      style={{
                        position: 'absolute',
                        top: daySelection.top,
                        height: Math.max(daySelection.bottom - daySelection.top, 2),
                        left: 2,
                        right: 2,
                        background: 'var(--mantine-color-teal-2)',
                        border: '1px dashed var(--mantine-color-teal-6)',
                        borderRadius: 4,
                        pointerEvents: 'none',
                      }}
                    />
                  )}

                  {laidOut.map(({ work, column, totalColumns }) => {
                    const top = timeToPx(work.planned_start, day)
                    const bottom = timeToPx(work.planned_end, day)
                    const height = Math.max(bottom - top, 18)
                    const widthPct = 100 / totalColumns
                    return (
                      <Tooltip
                        key={work.id}
                        label={`${dayjs(work.planned_start).format('HH:mm')}–${dayjs(work.planned_end).format('HH:mm')} · ${work.task.title} · ${work.assignee_name ?? 'без исполнителя'}`}
                        multiline
                        w={240}
                      >
                        <div
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={() => navigate(`/tasks/${work.task.id}`)}
                          style={{
                            position: 'absolute',
                            top,
                            height,
                            left: `calc(${column * widthPct}% + 2px)`,
                            width: `calc(${widthPct}% - 4px)`,
                            background: work.has_conflict ? 'var(--mantine-color-orange-1)' : 'var(--mantine-color-blue-1)',
                            border: `1px solid ${work.has_conflict ? 'var(--mantine-color-orange-5)' : 'var(--mantine-color-blue-4)'}`,
                            borderRadius: 4,
                            padding: '2px 4px',
                            fontSize: 11,
                            lineHeight: 1.2,
                            overflow: 'hidden',
                            cursor: 'pointer',
                          }}
                        >
                          <Text size="xs" fw={600} truncate>
                            {work.description}
                          </Text>
                          <Text size="xs" c="dimmed" truncate>
                            {work.task.title}
                          </Text>
                        </div>
                      </Tooltip>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {!loading && works.length === 0 && (
        <Text c="dimmed" ta="center" py="md">
          На эту неделю работ не запланировано
        </Text>
      )}

      <Group gap="lg">
        <Group gap={6}>
          <Badge color="blue" variant="light" size="sm">
            &nbsp;
          </Badge>
          <Text size="xs" c="dimmed">
            запланировано
          </Text>
        </Group>
        <Group gap={6}>
          <Badge color="orange" variant="light" size="sm">
            &nbsp;
          </Badge>
          <Text size="xs" c="dimmed">
            конфликт по времени
          </Text>
        </Group>
      </Group>

      {pendingRange && (
        <CreateTaskFromSlotModal
          range={pendingRange}
          clients={clients}
          onClientCreated={(client) => setClients((prev) => [...prev, client])}
          defaultAssigneeId={employeeId}
          onClose={() => setPendingRange(null)}
          onCreated={(taskId) => {
            setPendingRange(null)
            navigate(`/tasks/${taskId}`)
          }}
        />
      )}
    </Stack>
  )
}

// ---- New task + first work, created from a calendar time selection ----

function CreateTaskFromSlotModal({
  range,
  clients,
  onClientCreated,
  defaultAssigneeId,
  onClose,
  onCreated,
}: {
  range: PendingRange
  clients: Client[]
  onClientCreated: (client: Client) => void
  defaultAssigneeId: string | null
  onClose: () => void
  onCreated: (taskId: number) => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const form = useForm({
    initialValues: {
      client_id: '',
      title: '',
      work_description: '',
      planned_start: range.start,
      planned_end: range.end,
    },
  })

  async function handleSubmit(values: typeof form.values) {
    if (!values.client_id) {
      form.setFieldError('client_id', 'Выберите клиента')
      return
    }
    if (values.planned_end <= values.planned_start) {
      form.setFieldError('planned_end', 'Окончание должно быть позже начала')
      return
    }
    setSubmitting(true)
    try {
      const task = await createTask({ client_id: Number(values.client_id), title: values.title })
      await addWork(task.id, {
        catalog_item_id: null,
        description: values.work_description,
        service_price: '0',
        planned_start: values.planned_start.toISOString(),
        planned_end: values.planned_end.toISOString(),
        status: 'planned',
        assignee_id: defaultAssigneeId ? Number(defaultAssigneeId) : null,
      })
      onCreated(task.id)
    } catch (e) {
      notifications.show({ color: 'red', message: apiErrorMessage(e, 'Не удалось создать задачу') })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal opened onClose={onClose} title="Новая задача" size="md">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <ClientPicker
            clients={clients}
            value={form.values.client_id}
            onChange={(v) => form.setFieldValue('client_id', v ?? '')}
            onClientCreated={onClientCreated}
            required
            error={form.errors.client_id}
          />
          <TextInput label="Название задачи" required {...form.getInputProps('title')} />
          <TextInput label="Описание работы" required {...form.getInputProps('work_description')} />
          <Group grow>
            <DateTimePicker
              label="Начало"
              required
              valueFormat="DD.MM.YYYY HH:mm"
              {...form.getInputProps('planned_start')}
            />
            <DateTimePicker
              label="Окончание"
              required
              valueFormat="DD.MM.YYYY HH:mm"
              {...form.getInputProps('planned_end')}
            />
          </Group>
          <Button type="submit" loading={submitting}>
            Создать
          </Button>
        </Stack>
      </form>
    </Modal>
  )
}
