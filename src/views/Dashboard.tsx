import { useMemo } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { CalendarClock, Inbox, Sparkles } from 'lucide-react'
import { Checkbox } from '@/components/ui/Checkbox'
import { store, useDB } from '@/data/hooks'
import { DUE_STATE_CLASS, dueState, formatDue, parseDate } from '@/lib/dates'
import { cx } from '@/lib/utils'
import type { ShellContext } from '@/components/AppShell'
import type { Task } from '@/types'

export function Dashboard() {
  const db = useDB()
  const { openQuickAdd } = useOutletContext<ShellContext>()

  const { overdue, today, upcoming } = useMemo(() => {
    const open = db.tasks.filter((t) => !t.completed && t.dueAt)
    const overdue: Task[] = []
    const today: Task[] = []
    const upcoming: Task[] = []
    for (const t of open) {
      const s = dueState(t.dueAt)
      if (s === 'overdue') overdue.push(t)
      else if (s === 'today') today.push(t)
      else if (s === 'tomorrow' || s === 'upcoming') upcoming.push(t)
    }
    const byDate = (a: Task, b: Task) =>
      (parseDate(a.dueAt)?.getTime() ?? 0) - (parseDate(b.dueAt)?.getTime() ?? 0)
    return {
      overdue: overdue.sort(byDate),
      today: today.sort(byDate),
      upcoming: upcoming.sort(byDate).slice(0, 12),
    }
  }, [db.tasks])

  const empty = overdue.length === 0 && today.length === 0 && upcoming.length === 0

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <header className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">{greeting()}</h1>
            <p className="mt-1 text-sm text-ink-soft">
              {today.length > 0
                ? `${today.length} thing${today.length > 1 ? 's' : ''} due today.`
                : 'Everything you’ve got 2DO, in one place.'}
            </p>
          </div>
          <button
            onClick={openQuickAdd}
            className="rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent-hover"
          >
            Quick add
          </button>
        </header>

        {empty ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface py-16 text-center">
            <Sparkles className="mx-auto mb-3 h-9 w-9 text-line-strong" />
            <p className="text-sm font-medium text-ink-soft">You’re all clear.</p>
            <p className="mt-1 text-sm text-ink-faint">
              Tasks with a due date will show up here. Add one to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-7">
            <Section title="Overdue" tasks={overdue} accent="danger" icon={<CalendarClock className="h-4 w-4" />} />
            <Section title="Today" tasks={today} accent="accent" icon={<Sparkles className="h-4 w-4" />} />
            <Section title="Upcoming" tasks={upcoming} accent="muted" icon={<Inbox className="h-4 w-4" />} />
          </div>
        )}
      </div>
    </div>
  )
}

function Section({
  title,
  tasks,
  icon,
  accent,
}: {
  title: string
  tasks: Task[]
  icon: React.ReactNode
  accent: 'danger' | 'accent' | 'muted'
}) {
  if (tasks.length === 0) return null
  const color =
    accent === 'danger' ? 'text-danger' : accent === 'accent' ? 'text-accent' : 'text-ink-faint'
  return (
    <section>
      <div className={cx('mb-2 flex items-center gap-2 text-sm font-semibold', color)}>
        {icon}
        {title}
        <span className="text-ink-faint tabular-nums">{tasks.length}</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        {tasks.map((t, i) => (
          <DashRow key={t.id} task={t} divider={i > 0} />
        ))}
      </div>
    </section>
  )
}

function DashRow({ task, divider }: { task: Task; divider: boolean }) {
  const db = useDB()
  const navigate = useNavigate()
  const project = db.projects.find((p) => p.id === task.projectId)
  const area = project && db.areas.find((a) => a.id === project.areaId)
  const ds = dueState(task.dueAt)

  return (
    <div
      className={cx(
        'group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-line-soft/60',
        divider && 'border-t border-line-soft',
      )}
    >
      <Checkbox checked={task.completed} onChange={() => store.toggleTask(task.id)} />
      <button
        onClick={() => navigate(`/project/${task.projectId}?task=${task.id}`)}
        className="flex min-w-0 flex-1 flex-col items-start text-left"
      >
        <span className="truncate text-sm text-ink">{task.title}</span>
        <span className="flex items-center gap-1.5 text-xs text-ink-faint">
          {area && <span className="h-1.5 w-1.5 rounded-full" style={{ background: area.color }} />}
          <span className="truncate">{project?.name}</span>
        </span>
      </button>
      <span className={cx('shrink-0 text-xs font-medium', DUE_STATE_CLASS[ds])}>
        {formatDue(task.dueAt)}
      </span>
    </div>
  )
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}
