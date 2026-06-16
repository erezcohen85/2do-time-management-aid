import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CalendarDays, GripVertical, Link2, ListTree } from 'lucide-react'
import { Checkbox } from './ui/Checkbox'
import { store, useDB } from '@/data/hooks'
import { DUE_STATE_CLASS, dueState, formatDue } from '@/lib/dates'
import { cx } from '@/lib/utils'
import type { Task } from '@/types'

export function TaskRow({
  task,
  selected,
  onSelect,
}: {
  task: Task
  selected: boolean
  onSelect: () => void
}) {
  const db = useDB()
  const subs = db.subtasks.filter((s) => s.taskId === task.id)
  const subsDone = subs.filter((s) => s.completed).length
  const linkCount = db.links.filter((l) => l.parentType === 'task' && l.parentId === task.id).length
  const ds = dueState(task.dueAt)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cx(
        'group flex items-center gap-2.5 rounded-xl border px-2.5 py-2.5 transition-colors',
        selected
          ? 'border-accent/30 bg-accent-softer'
          : 'border-transparent bg-surface hover:border-line',
        isDragging && 'z-10 opacity-80 shadow-lg',
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="grid h-5 w-5 shrink-0 cursor-grab place-items-center text-ink-faint opacity-0 transition-opacity group-hover:opacity-60 active:cursor-grabbing"
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Checkbox checked={task.completed} onChange={() => store.toggleTask(task.id)} />

      <button onClick={onSelect} className="flex min-w-0 flex-1 flex-col items-start text-left">
        <span
          className={cx(
            'truncate text-sm',
            task.completed ? 'text-ink-faint line-through' : 'text-ink',
          )}
        >
          {task.title}
        </span>
        {task.description && (
          <span className="mt-0.5 truncate text-xs text-ink-faint">{task.description}</span>
        )}
      </button>

      <div className="flex shrink-0 items-center gap-2.5 text-ink-faint">
        {linkCount > 0 && (
          <span className="flex items-center gap-0.5 text-xs" title={`${linkCount} link(s)`}>
            <Link2 className="h-3.5 w-3.5" />
            {linkCount}
          </span>
        )}
        {subs.length > 0 && (
          <span className="flex items-center gap-0.5 text-xs tabular-nums" title="Subtasks">
            <ListTree className="h-3.5 w-3.5" />
            {subsDone}/{subs.length}
          </span>
        )}
        {ds !== 'none' && (
          <span className={cx('flex items-center gap-1 text-xs font-medium', DUE_STATE_CLASS[ds])}>
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDue(task.dueAt)}
          </span>
        )}
      </div>
    </div>
  )
}
