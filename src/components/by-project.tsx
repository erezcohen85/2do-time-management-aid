import { useState } from 'react'
import { MoreHorizontal, Plus } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ItemRow } from '@/components/item-row'
import { NameDialog } from '@/components/name-dialog'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { actions, makeItem, newId } from '@/data/actions'
import { useDb } from '@/data/hooks'
import { useI18n } from '@/i18n'
import { useDetail } from '@/lib/detail-state'
import type { Area, Item, Project } from '@/types'

function InlineAdd({ placeholder, onAdd }: { placeholder: string; onAdd: (title: string) => void }) {
  const [v, setV] = useState('')
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (v.trim()) {
          onAdd(v.trim())
          setV('')
        }
      }}
    >
      <Plus className="size-4 text-muted-foreground" />
      <Input className="h-8" aria-label={placeholder} placeholder={placeholder} value={v} onChange={(e) => setV(e.target.value)} />
    </form>
  )
}

function TaskTree({ tasks, all }: { tasks: Item[]; all: Item[] }) {
  return (
    <div className="grid gap-1.5">
      {tasks.map((task) => (
        <div key={task.id} className="grid gap-1.5">
          <ItemRow item={task} showPath={false} />
          {all
            .filter((s) => s.parentId === task.id && !s.done)
            .map((s) => (
              <ItemRow key={s.id} item={s} showPath={false} indent />
            ))}
        </div>
      ))}
    </div>
  )
}

function ProjectBlock({ project, items }: { project: Project; items: Item[] }) {
  const { t } = useI18n()
  const { openProject } = useDetail()
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const tasks = items.filter((i) => i.projectId === project.id && i.parentId === null && !i.done)
  return (
    <div className="grid gap-2 ps-4" data-testid="project-block">
      <div className="flex items-center gap-2">
        <button type="button" className="text-start font-medium" onClick={() => openProject(project.id)}>
          {project.name}
        </button>
        <span className="text-xs text-muted-foreground">{t('tm.openTasks', { n: tasks.length })}</span>
        {project.archived && <span className="text-xs text-muted-foreground">· {t('project.archived')}</span>}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="ms-auto size-7" aria-label={project.name}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => openProject(project.id)}>{t('project.tasks')}…</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setRenaming(true)}>{t('common.rename')}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
              {t('common.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <TaskTree tasks={tasks} all={items} />
      <InlineAdd
        placeholder={t('project.addTask')}
        onAdd={(title) => actions.addItem(makeItem({ id: newId(), title, projectId: project.id }))}
      />
      <NameDialog
        open={renaming}
        onOpenChange={setRenaming}
        title={t('common.rename')}
        label={t('project.name')}
        initial={project.name}
        onSubmit={(name) => {
          actions.updateProject(project.id, { name })
          setRenaming(false)
        }}
      />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={t('project.delete.title')}
        body={t('project.delete.body')}
        confirmLabel={t('common.delete')}
        onConfirm={() => actions.deleteProject(project.id)}
      />
    </div>
  )
}

function AreaBlock({ area, projects, items }: { area: Area; projects: Project[]; items: Item[] }) {
  const { t } = useI18n()
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [adding, setAdding] = useState(false)
  return (
    <section className="grid gap-3" data-testid="area-block">
      <div className="flex items-center gap-2 border-b pb-1">
        <h2 className="text-lg font-semibold">{area.name}</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="ms-auto size-7" aria-label={area.name}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setAdding(true)}>{t('project.add')}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setRenaming(true)}>{t('common.rename')}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
              {t('common.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {projects.map((p) => (
        <ProjectBlock key={p.id} project={p} items={items} />
      ))}
      <div>
        <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
          <Plus /> {t('project.add')}
        </Button>
      </div>
      <NameDialog
        open={adding}
        onOpenChange={setAdding}
        title={t('project.add')}
        label={t('project.name')}
        onSubmit={(name) => {
          actions.addProject({ id: newId(), areaId: area.id, name })
          setAdding(false)
        }}
      />
      <NameDialog
        open={renaming}
        onOpenChange={setRenaming}
        title={t('common.rename')}
        label={t('area.name')}
        initial={area.name}
        onSubmit={(name) => {
          actions.renameArea(area.id, name)
          setRenaming(false)
        }}
      />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={t('area.delete.title')}
        body={t('area.delete.body')}
        confirmLabel={t('common.delete')}
        onConfirm={() => actions.deleteArea(area.id)}
      />
    </section>
  )
}

export function ByProject() {
  const { t } = useI18n()
  const areas = useDb((db) => db.areas)
  const projects = useDb((db) => db.projects)
  const items = useDb((db) => db.items)
  const [addingArea, setAddingArea] = useState(false)
  const loose = items.filter((i) => i.projectId === null && i.parentId === null && !i.done)

  return (
    <div className="grid gap-6">
      {areas
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((a) => (
          <AreaBlock
            key={a.id}
            area={a}
            projects={projects.filter((p) => p.areaId === a.id).sort((x, y) => x.order - y.order)}
            items={items}
          />
        ))}
      <div>
        <Button variant="outline" size="sm" onClick={() => setAddingArea(true)}>
          <Plus /> {t('area.add')}
        </Button>
      </div>
      <section className="grid gap-2" data-testid="loose-tasks">
        <h2 className="border-b pb-1 text-lg font-semibold">{t('tm.loose')}</h2>
        <TaskTree tasks={loose} all={items} />
        <InlineAdd placeholder={t('project.addTask')} onAdd={(title) => actions.addItem(makeItem({ id: newId(), title }))} />
      </section>
      <NameDialog
        open={addingArea}
        onOpenChange={setAddingArea}
        title={t('area.add')}
        label={t('area.name')}
        onSubmit={(name) => {
          actions.addArea({ id: newId(), name })
          setAddingArea(false)
        }}
      />
    </div>
  )
}
