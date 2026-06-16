import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckSquare, FolderKanban, Layers, Search } from 'lucide-react'
import { Modal } from './ui/Modal'
import { useDB } from '@/data/hooks'

interface Hit {
  id: string
  type: 'area' | 'project' | 'task'
  label: string
  sub?: string
  to: string
}

export function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const db = useDB()
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  const results = useMemo<Hit[]>(() => {
    const term = q.trim().toLowerCase()
    if (!term) return []
    const hits: Hit[] = []

    for (const a of db.areas) {
      if (a.name.toLowerCase().includes(term))
        hits.push({ id: a.id, type: 'area', label: a.name, to: '/' })
    }
    for (const p of db.projects) {
      if (p.name.toLowerCase().includes(term)) {
        const area = db.areas.find((a) => a.id === p.areaId)
        hits.push({
          id: p.id,
          type: 'project',
          label: p.name,
          sub: area?.name,
          to: `/project/${p.id}`,
        })
      }
    }
    for (const t of db.tasks) {
      const inText =
        t.title.toLowerCase().includes(term) ||
        (t.description ?? '').toLowerCase().includes(term) ||
        (t.notes ?? '').toLowerCase().includes(term)
      if (inText) {
        const proj = db.projects.find((p) => p.id === t.projectId)
        hits.push({
          id: t.id,
          type: 'task',
          label: t.title,
          sub: proj?.name,
          to: `/project/${t.projectId}?task=${t.id}`,
        })
      }
    }
    return hits.slice(0, 30)
  }, [q, db])

  const go = (hit: Hit) => {
    navigate(hit.to)
    onClose()
    setQ('')
  }

  return (
    <Modal open={open} onClose={onClose} align="top">
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
        <Search className="h-4.5 w-4.5 text-ink-faint" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results[0]) go(results[0])
          }}
          placeholder="Search areas, projects, tasks…"
          className="flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-faint"
        />
      </div>
      <div className="max-h-[50vh] overflow-y-auto py-1.5">
        {q.trim() && results.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-ink-faint">No matches.</p>
        )}
        {results.map((hit) => (
          <button
            key={`${hit.type}-${hit.id}`}
            onClick={() => go(hit)}
            className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-line-soft"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-line-soft text-ink-faint">
              {hit.type === 'area' ? (
                <Layers className="h-4 w-4" />
              ) : hit.type === 'project' ? (
                <FolderKanban className="h-4 w-4" />
              ) : (
                <CheckSquare className="h-4 w-4" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-ink">{hit.label}</span>
              {hit.sub && <span className="block truncate text-xs text-ink-faint">{hit.sub}</span>}
            </span>
            <span className="shrink-0 text-[11px] text-ink-faint capitalize">{hit.type}</span>
          </button>
        ))}
      </div>
    </Modal>
  )
}
