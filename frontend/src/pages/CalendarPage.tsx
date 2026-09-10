import { Badge, Button, Group, Select, Stack, Text, Title, Tooltip } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { IconAlertTriangle } from '@tabler/icons-react'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listCalendarWorks } from '../api/calendar'
import type { CalendarWorkItem, User } from '../api/types'
import { listUsers } from '../api/users'
import { useAuth } from '../context/AuthContext'

const PX_PER_HOUR = 56
const MIN_RANGE_HOURS = 10
const DEFAULT_RANGE = { startHour: 8, endHour: 20 }

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

export function CalendarPage() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [weekStart, setWeekStart] = useState<Date>(dayjs().startOf('week').toDate())
  const [users, setUsers] = useState<User[]>([])
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [works, setWorks] = useState<CalendarWorkItem[]>([])
  const [loading, setLoading] = useState(true)

  const weekEnd = useMemo(() => dayjs(weekStart).add(7, 'day').toDate(), [weekStart])
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => dayjs(weekStart).add(i, 'day')), [weekStart])

  useEffect(() => {
    if (isAdmin) listUsers().then(setUsers)
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
        <div style={{ display: 'flex', flex: 1, overflowX: 'auto' }}>
          {days.map((day) => {
            const key = day.format('YYYY-MM-DD')
            const dayWorks = worksByDay.get(key) ?? []
            const laidOut = layoutDay(dayWorks)
            const isToday = key === today

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

                <div style={{ position: 'relative', height: gridHeight }}>
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
    </Stack>
  )
}
