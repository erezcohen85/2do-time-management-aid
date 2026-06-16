import { Bell, CalendarDays, Trash2, X } from 'lucide-react'
import { store, useDB } from '@/data/hooks'
import { Checkbox } from './ui/Checkbox'
import { LinkSection } from './LinkSection'
import { SubtaskList } from './SubtaskList'
import { toDateInputValue } from '@/lib/dates'
import { cx } from '@/lib/utils'

export function TaskDetail({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const db = useDB()
  const task = db.tasks.find((t) => t.id === taskId)

  if (!task) return null
  const project = db.projects.find((p) => p.id === task.projectId)
  const area = project && db.areas.find((a) => a.id === project.areaId)

  return (
    <aside className="flex h-full w-full flex-col bg-surface">
      {/* header */}
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-ink-faint">
          {area && (
            <>
              <span className="h-2 w-2 rounded-full" style={{ background: area.color }} />
              <span className="truncate">{area.name}</span>
              <span>/</span>
            </>
          )}
          <span className="truncate text-ink-soft">{project?.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (confirm('Delete this task?')) {
                store.deleteTask(task.id)
                onClose()
              }
            }}
            className="grid h-7 w-7 place-items-center rounded-lg text-ink-faint hover:bg-line-soft hover:text-danger"
            title="Delete task"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-lg text-ink-faint hover:bg-line-soft hover:text-ink"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
        {/* title */}
        <div className="flex items-start gap-3">
          <div className="pt-1">
            <Checkbox checked={task.completed} onChange={() => store.toggleTask(task.id)} />
          </div>
          <textarea
            value={task.title}
            onChange={(e) => store.updateTask(task.id, { title: e.target.value })}
            rows={1}
            className={cx(
              'flex-1 resize-none bg-transparent text-lg font-semibold outline-none',
              task.completed ? 'text-ink-faint line-through' : 'text-ink',
            )}
          />
        </div>

        {/* dates */}
        <div className="grid grid-cols-2 gap-3">
          <Field icon={<CalendarDays className="h-4 w-4" />} label="Due date">
            <input
              type="date"
              value={toDateInputValue(task.dueAt)}
              onChange={(e) => store.updateTask(task.id, { dueAt: e.target.value || null })}
              className="w-full bg-transparent text-sm text-ink outline-none"
            />
          </Field>
          <Field icon={<Bell className="h-4 w-4" />} label="Reminder">
            <input
              type="datetime-local"
              value={task.remindAt ? task.remindAt.slice(0, 16) : ''}
              onChange={(e) =>
                store.updateTask(task.id, {
                  remindAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                })
              }
              className="w-full bg-transparent text-sm text-ink outline-none"
            />
          </Field>
        </div>

        {/* description */}
        <div>
          <Label>Description</Label>
          <textarea
            value={task.description ?? ''}
            onChange={(e) => store.updateTask(task.id, { description: e.target.value })}
            placeholder="Add a short description…"
            rows={2}
            className="w-full resize-none rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink-soft outline-none placeholder:text-ink-faint focus:border-accent/40 focus:bg-surface focus:ring-2 focus:ring-accent/15"
          />
        </div>

        {/* notes */}
        <div>
          <Label>Notes</Label>
          <textarea
            value={task.notes ?? ''}
            onChange={(e) => store.updateTask(task.id, { notes: e.target.value })}
            placeholder="Longer notes, context, anything…"
            rows={4}
            className="w-full resize-none rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink-soft outline-none placeholder:text-ink-faint focus:border-accent/40 focus:bg-surface focus:ring-2 focus:ring-accent/15"
          />
        </div>

        <LinkSection parentType="task" parentId={task.id} />

        <div className="border-t border-line pt-4">
          <SubtaskList taskId={task.id} />
        </div>
      </div>
    </aside>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 text-xs font-semibold tracking-wide text-ink-faint uppercase">
      {children}
    </div>
  )
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-line bg-canvas px-3 py-2">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-ink-faint">
        {icon}
        {label}
      </div>
      {children}
    </div>
  )
}
