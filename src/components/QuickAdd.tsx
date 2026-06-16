import { useState } from 'react'
import { CornerDownLeft } from 'lucide-react'
import { Modal } from './ui/Modal'
import { store, useDB } from '@/data/hooks'

export function QuickAdd({ open, onClose }: { open: boolean; onClose: () => void }) {
  const db = useDB()
  const projects = [...db.projects].sort((a, b) => a.name.localeCompare(b.name))
  const [projectId, setProjectId] = useState('')
  const [title, setTitle] = useState('')
  const [justAdded, setJustAdded] = useState<string | null>(null)

  const effectiveProject = projectId || projects[0]?.id || ''

  const submit = (keepOpen: boolean) => {
    const v = title.trim()
    if (!v || !effectiveProject) return
    store.addTask(effectiveProject, v)
    setTitle('')
    setJustAdded(v)
    if (!keepOpen) onClose()
  }

  return (
    <Modal open={open} onClose={onClose} align="top">
      <div className="p-4">
        <div className="mb-3 text-xs font-semibold tracking-wide text-ink-faint uppercase">
          Quick add task
        </div>

        {projects.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-faint">
            Create an area and project first, then add tasks here.
          </p>
        ) : (
          <>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit(e.metaKey || e.ctrlKey)
              }}
              placeholder="What needs doing?"
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2.5 text-base text-ink outline-none focus:border-accent/40 focus:bg-surface focus:ring-2 focus:ring-accent/15"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                <span className="text-ink-faint">in</span>
                <select
                  value={effectiveProject}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="rounded-md border border-line bg-surface px-2 py-1 text-sm text-ink outline-none focus:border-accent/40"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                onClick={() => submit(false)}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
              >
                Add task <CornerDownLeft className="h-3.5 w-3.5" />
              </button>
            </div>
            {justAdded && (
              <p className="mt-2 text-xs text-ink-faint">
                Added “{justAdded}”. <span className="text-ink-faint">⌘↵ to add another.</span>
              </p>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
