import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  LayoutDashboard,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { Logo } from './Logo'
import { Menu } from './ui/Menu'
import { InlineInput } from './ui/InlineInput'
import { store, useAreas, useOpenTaskCount, useProjects } from '@/data/hooks'
import { AREA_COLORS, cx } from '@/lib/utils'
import type { Area } from '@/types'

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const areas = useAreas()
  const [addingArea, setAddingArea] = useState(false)

  return (
    <nav className="flex h-full w-full flex-col bg-surface">
      <div className="flex items-center px-4 pt-4 pb-3">
        <Logo />
      </div>

      <div className="px-2">
        <NavLink
          to="/"
          onClick={onNavigate}
          className={({ isActive }) =>
            cx(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive ? 'bg-accent-soft text-accent' : 'text-ink-soft hover:bg-line-soft',
            )
          }
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </NavLink>
      </div>

      <div className="mt-4 flex items-center justify-between px-4 pb-1">
        <span className="text-[11px] font-semibold tracking-wider text-ink-faint uppercase">
          Areas
        </span>
        <button
          onClick={() => setAddingArea(true)}
          className="grid h-5 w-5 place-items-center rounded text-ink-faint transition-colors hover:bg-line-soft hover:text-ink"
          title="New area"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {areas.map((area) => (
          <AreaItem key={area.id} area={area} onNavigate={onNavigate} />
        ))}

        {addingArea && (
          <div className="px-2 py-1">
            <InlineInput
              placeholder="Area name"
              onCommit={(name) => {
                store.addArea(name, AREA_COLORS[areas.length % AREA_COLORS.length])
                setAddingArea(false)
              }}
              onCancel={() => setAddingArea(false)}
            />
          </div>
        )}

        {areas.length === 0 && !addingArea && (
          <button
            onClick={() => setAddingArea(true)}
            className="mx-2 mt-1 flex w-[calc(100%-1rem)] items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-faint transition-colors hover:bg-line-soft hover:text-ink"
          >
            <Plus className="h-4 w-4" /> Add your first area
          </button>
        )}
      </div>
    </nav>
  )
}

function AreaItem({ area, onNavigate }: { area: Area; onNavigate?: () => void }) {
  const projects = useProjects(area.id)
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(true)
  const [renaming, setRenaming] = useState(false)
  const [addingProject, setAddingProject] = useState(false)

  return (
    <div className="mb-0.5">
      <div className="group flex items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-line-soft">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="grid h-4 w-4 shrink-0 place-items-center text-ink-faint"
        >
          <ChevronRight
            className={cx('h-3.5 w-3.5 transition-transform', expanded && 'rotate-90')}
          />
        </button>
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: area.color }}
        />
        {renaming ? (
          <InlineInput
            initial={area.name}
            onCommit={(name) => {
              store.updateArea(area.id, { name })
              setRenaming(false)
            }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex-1 truncate text-left text-sm font-medium text-ink"
          >
            {area.icon && <span className="mr-1">{area.icon}</span>}
            {area.name}
          </button>
        )}
        <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => {
              setExpanded(true)
              setAddingProject(true)
            }}
            className="grid h-5 w-5 place-items-center rounded text-ink-faint hover:bg-line hover:text-ink"
            title="New project"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <Menu
            items={[
              {
                label: 'Rename area',
                icon: <Pencil />,
                onClick: () => setRenaming(true),
              },
              {
                label: 'Delete area',
                icon: <Trash2 />,
                danger: true,
                onClick: () => {
                  if (confirm(`Delete "${area.name}" and all its projects?`))
                    store.deleteArea(area.id)
                },
              },
            ]}
            trigger={({ toggle }) => (
              <button
                onClick={toggle}
                className="grid h-5 w-5 place-items-center rounded text-ink-faint hover:bg-line hover:text-ink"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            )}
          />
        </div>
      </div>

      {expanded && (
        <div className="ml-[1.35rem] border-l border-line pl-2">
          {projects.map((p) => (
            <ProjectItem key={p.id} projectId={p.id} name={p.name} onNavigate={onNavigate} />
          ))}
          {addingProject && (
            <div className="py-1 pr-2">
              <InlineInput
                placeholder="Project name"
                onCommit={(name) => {
                  const proj = store.addProject(area.id, name)
                  setAddingProject(false)
                  navigate(`/project/${proj.id}`)
                  onNavigate?.()
                }}
                onCancel={() => setAddingProject(false)}
              />
            </div>
          )}
          {projects.length === 0 && !addingProject && (
            <button
              onClick={() => setAddingProject(true)}
              className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-ink-faint hover:text-ink"
            >
              <Plus className="h-3 w-3" /> Add project
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function ProjectItem({
  projectId,
  name,
  onNavigate,
}: {
  projectId: string
  name: string
  onNavigate?: () => void
}) {
  const count = useOpenTaskCount(projectId)
  const [renaming, setRenaming] = useState(false)

  if (renaming) {
    return (
      <div className="py-1 pr-2">
        <InlineInput
          initial={name}
          onCommit={(v) => {
            store.updateProject(projectId, { name: v })
            setRenaming(false)
          }}
          onCancel={() => setRenaming(false)}
        />
      </div>
    )
  }

  return (
    <NavLink
      to={`/project/${projectId}`}
      onClick={onNavigate}
      className={({ isActive }) =>
        cx(
          'group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
          isActive ? 'bg-accent-soft font-medium text-accent' : 'text-ink-soft hover:bg-line-soft',
        )
      }
    >
      <span className="flex-1 truncate">{name}</span>
      {count > 0 && (
        <span className="text-xs text-ink-faint tabular-nums group-hover:hidden">{count}</span>
      )}
      <span className="hidden group-hover:flex">
        <Menu
          items={[
            { label: 'Rename', icon: <Pencil />, onClick: () => setRenaming(true) },
            {
              label: 'Delete project',
              icon: <Trash2 />,
              danger: true,
              onClick: () => {
                if (confirm(`Delete project "${name}"?`)) store.deleteProject(projectId)
              },
            },
          ]}
          trigger={({ toggle }) => (
            <button
              onClick={(e) => {
                e.preventDefault()
                toggle()
              }}
              className="grid h-5 w-5 place-items-center rounded text-ink-faint hover:bg-line hover:text-ink"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          )}
        />
      </span>
    </NavLink>
  )
}
