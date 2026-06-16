import { useState } from 'react'
import { ChevronRight, Clock, ListChecks, Plus, Trash2, X } from 'lucide-react'
import { store, useChecklist, useSubtasks } from '@/data/hooks'
import { Checkbox } from './ui/Checkbox'
import { LinkSection } from './LinkSection'
import { Menu } from './ui/Menu'
import { cx } from '@/lib/utils'
import type { Subtask } from '@/types'

export function SubtaskList({ taskId }: { taskId: string }) {
  const subtasks = useSubtasks(taskId)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  const done = subtasks.filter((s) => s.completed).length

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-xs font-semibold tracking-wide text-ink-faint uppercase">
          Subtasks
        </span>
        {subtasks.length > 0 && (
          <span className="text-xs text-ink-faint tabular-nums">
            {done}/{subtasks.length}
          </span>
        )}
      </div>

      <div className="flex flex-col">
        {subtasks.map((s) => (
          <SubtaskRow key={s.id} subtask={s} siblings={subtasks} />
        ))}
      </div>

      {adding ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft.trim()) store.addSubtask(taskId, draft.trim())
            setDraft('')
            setAdding(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (draft.trim()) store.addSubtask(taskId, draft.trim())
              setDraft('')
            } else if (e.key === 'Escape') {
              setDraft('')
              setAdding(false)
            }
          }}
          placeholder="Subtask name, Enter to add…"
          className="mt-1 w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/15"
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-1 flex items-center gap-1.5 px-1 py-1 text-sm text-ink-faint transition-colors hover:text-accent"
        >
          <Plus className="h-4 w-4" /> Add subtask
        </button>
      )}
    </div>
  )
}

function SubtaskRow({ subtask, siblings }: { subtask: Subtask; siblings: Subtask[] }) {
  const checklist = useChecklist(subtask.id)
  const [expanded, setExpanded] = useState(false)

  const waitingOn = siblings.find((s) => s.id === subtask.waitingOnSubtaskId)
  const blocked = waitingOn && !waitingOn.completed
  const hasDetail = checklist.length > 0

  const otherSiblings = siblings.filter((s) => s.id !== subtask.id)

  return (
    <div className="rounded-lg transition-colors hover:bg-line-soft/60">
      <div className="group flex items-center gap-1.5 px-1 py-1.5">
        <button
          onClick={() => setExpanded((e) => !e)}
          className={cx(
            'grid h-5 w-5 shrink-0 place-items-center rounded text-ink-faint transition-colors hover:bg-line',
            !hasDetail && !expanded && 'opacity-0 group-hover:opacity-60',
          )}
          title="Show checklist & links"
        >
          <ChevronRight className={cx('h-3.5 w-3.5 transition-transform', expanded && 'rotate-90')} />
        </button>

        <Checkbox checked={subtask.completed} onChange={() => store.toggleSubtask(subtask.id)} />

        <input
          value={subtask.title}
          onChange={(e) => store.updateSubtask(subtask.id, { title: e.target.value })}
          className={cx(
            'flex-1 bg-transparent text-sm outline-none',
            subtask.completed ? 'text-ink-faint line-through' : 'text-ink',
          )}
        />

        {blocked && (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
            <Clock className="h-3 w-3" />
            Waiting on {waitingOn!.title}
          </span>
        )}

        <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
          <Menu
            items={[
              ...otherSiblings.map((s) => ({
                label: `Waiting on: ${s.title}`,
                icon: <Clock />,
                onClick: () => store.updateSubtask(subtask.id, { waitingOnSubtaskId: s.id }),
              })),
              ...(subtask.waitingOnSubtaskId
                ? [
                    {
                      label: 'Clear "waiting on"',
                      icon: <X />,
                      onClick: () =>
                        store.updateSubtask(subtask.id, { waitingOnSubtaskId: null }),
                    },
                  ]
                : []),
              {
                label: 'Delete subtask',
                icon: <Trash2 />,
                danger: true,
                onClick: () => store.deleteSubtask(subtask.id),
              },
            ]}
            trigger={({ toggle }) => (
              <button
                onClick={toggle}
                className="grid h-6 w-6 place-items-center rounded text-ink-faint hover:bg-line hover:text-ink"
                title="Subtask options"
              >
                <Clock className="h-3.5 w-3.5" />
              </button>
            )}
          />
          <button
            onClick={() => store.deleteSubtask(subtask.id)}
            className="grid h-6 w-6 place-items-center rounded text-ink-faint hover:bg-line hover:text-danger"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mb-1 ml-7 flex flex-col gap-3 border-l border-line pl-3">
          <SubChecklist subtaskId={subtask.id} />
          <LinkSection parentType="subtask" parentId={subtask.id} compact />
        </div>
      )}
    </div>
  )
}

function SubChecklist({ subtaskId }: { subtaskId: string }) {
  const items = useChecklist(subtaskId)
  const [draft, setDraft] = useState('')

  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ink-faint uppercase">
        <ListChecks className="h-3.5 w-3.5" /> Checklist
      </div>
      <div className="flex flex-col gap-0.5">
        {items.map((c) => (
          <div key={c.id} className="group flex items-center gap-2 py-0.5">
            <Checkbox
              size="sm"
              checked={c.completed}
              onChange={() => store.toggleChecklistItem(c.id)}
            />
            <input
              value={c.text}
              onChange={(e) => store.updateChecklistItem(c.id, { text: e.target.value })}
              className={cx(
                'flex-1 bg-transparent text-sm outline-none',
                c.completed ? 'text-ink-faint line-through' : 'text-ink-soft',
              )}
            />
            <button
              onClick={() => store.deleteChecklistItem(c.id)}
              className="grid h-5 w-5 place-items-center rounded text-ink-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && draft.trim()) {
            store.addChecklistItem(subtaskId, draft.trim())
            setDraft('')
          }
        }}
        placeholder="Add item…"
        className="mt-1 w-full bg-transparent px-1 py-0.5 text-sm text-ink-soft outline-none placeholder:text-ink-faint"
      />
    </div>
  )
}
