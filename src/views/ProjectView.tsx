import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CheckCircle2, ChevronDown, Plus } from 'lucide-react'
import { TaskRow } from '@/components/TaskRow'
import { TaskDetail } from '@/components/TaskDetail'
import { store, useDB, useProject, useTasks } from '@/data/hooks'
import { cx } from '@/lib/utils'

export function ProjectView() {
  const { projectId = '' } = useParams()
  const project = useProject(projectId)
  const tasks = useTasks(projectId)
  const db = useDB()
  const area = project && db.areas.find((a) => a.id === project.areaId)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [draft, setDraft] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()

  // reset selection when switching projects / when selected task disappears
  useEffect(() => setSelectedId(null), [projectId])

  // open a task passed via ?task=… (from dashboard / search), then clear it
  useEffect(() => {
    const t = searchParams.get('task')
    if (t) {
      setSelectedId(t)
      searchParams.delete('task')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])
  useEffect(() => {
    if (selectedId && !db.tasks.find((t) => t.id === selectedId)) setSelectedId(null)
  }, [db.tasks, selectedId])

  const active = useMemo(() => tasks.filter((t) => !t.completed), [tasks])
  const completed = useMemo(() => tasks.filter((t) => t.completed), [tasks])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  if (!project) {
    return (
      <div className="grid h-full place-items-center text-ink-faint">Project not found.</div>
    )
  }

  const onDragEnd = (e: DragEndEvent) => {
    const { active: a, over } = e
    if (!over || a.id === over.id) return
    const ids = active.map((t) => t.id)
    const next = arrayMove(ids, ids.indexOf(a.id as string), ids.indexOf(over.id as string))
    store.reorderTasks(projectId, next)
  }

  const addTask = () => {
    const v = draft.trim()
    if (!v) return
    store.addTask(projectId, v)
    setDraft('')
  }

  return (
    <div className="flex h-full min-h-0">
      {/* list column */}
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <header className="border-b border-line px-6 py-4">
          <div className="mb-1 flex items-center gap-2 text-xs text-ink-faint">
            {area && (
              <>
                <span className="h-2 w-2 rounded-full" style={{ background: area.color }} />
                {area.name}
              </>
            )}
          </div>
          <input
            value={project.name}
            onChange={(e) => store.updateProject(project.id, { name: e.target.value })}
            className="w-full bg-transparent text-2xl font-bold tracking-tight text-ink outline-none"
          />
          <input
            value={project.description ?? ''}
            onChange={(e) => store.updateProject(project.id, { description: e.target.value })}
            placeholder="Add a description…"
            className="mt-1 w-full bg-transparent text-sm text-ink-soft outline-none placeholder:text-ink-faint"
          />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="mx-auto max-w-3xl">
            {/* quick add */}
            <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2.5 focus-within:border-accent/40 focus-within:ring-2 focus-within:ring-accent/15">
              <Plus className="h-4.5 w-4.5 text-ink-faint" />
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTask()}
                placeholder="Add a task…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink-faint"
              />
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={active.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-0.5">
                  {active.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      selected={selectedId === t.id}
                      onSelect={() => setSelectedId(t.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {active.length === 0 && (
              <div className="py-12 text-center text-sm text-ink-faint">
                <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-line-strong" />
                Nothing to do here yet. Add your first task above.
              </div>
            )}

            {completed.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={() => setShowCompleted((s) => !s)}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold tracking-wide text-ink-faint uppercase hover:text-ink-soft"
                >
                  <ChevronDown
                    className={cx('h-3.5 w-3.5 transition-transform', !showCompleted && '-rotate-90')}
                  />
                  Completed ({completed.length})
                </button>
                {showCompleted && (
                  <div className="mt-1 flex flex-col gap-0.5">
                    {completed.map((t) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        selected={selectedId === t.id}
                        onSelect={() => setSelectedId(t.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* detail pane: side column on desktop, slide-over overlay on mobile */}
      {selectedId && (
        <div className="fixed inset-0 z-40 lg:static lg:z-auto lg:w-[420px] lg:shrink-0">
          {/* mobile backdrop only */}
          <div
            className="absolute inset-0 bg-ink/20 lg:hidden"
            onClick={() => setSelectedId(null)}
          />
          <div className="absolute inset-y-0 right-0 w-full max-w-md border-l border-line bg-surface lg:static lg:max-w-none lg:w-full">
            <TaskDetail taskId={selectedId} onClose={() => setSelectedId(null)} />
          </div>
        </div>
      )}
    </div>
  )
}
