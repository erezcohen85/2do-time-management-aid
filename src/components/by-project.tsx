import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { ChevronRight, FolderPlus, MoreHorizontal, Plus } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { DraggableRow } from '@/components/draggable-row'
import { ItemRow } from '@/components/item-row'
import { NameDialog } from '@/components/name-dialog'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { actions, makeItem, newId } from '@/data/actions'
import { useDb } from '@/data/hooks'
import { useI18n } from '@/i18n'
import { useDetail } from '@/lib/detail-state'
import { useCollapsed } from '@/lib/collapsed-state'
import type { Area, Item, Project } from '@/types'

/** Appears only after the "+" next to a title is pressed; focused and ready to type. Enter adds, Esc or an empty blur closes. */
function InlineAdd({ placeholder, onAdd, onClose }: { placeholder: string; onAdd: (title: string) => void; onClose: () => void }) {
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
      <Input
        autoFocus
        className="h-8"
        aria-label={placeholder}
        placeholder={placeholder}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => !v.trim() && onClose()}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      />
    </form>
  )
}

/** Chevron toggle + title slot + "+" right after the title (end side in English, start side in Hebrew). */
function NodeHeader({
  id, dropId, name, collapsed, onToggle, onPlus, onAddProject, titleNode, children,
}: {
  id: string
  /** Dropping a dragged task here moves it into this area, project or the loose bucket. */
  dropId: string
  name: string
  collapsed: boolean
  onToggle: () => void
  onPlus: () => void
  /** Areas only: a second, quieter icon right after the task +. */
  onAddProject?: () => void
  titleNode: React.ReactNode
  children?: React.ReactNode
}) {
  const { t } = useI18n()
  const { setNodeRef, isOver } = useDroppable({ id: dropId })
  return (
    <div ref={setNodeRef} className={`flex items-center gap-1 rounded-md ${isOver ? 'bg-accent ring-1 ring-ring' : ''}`} data-node={id} data-drop={dropId}>
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        aria-expanded={!collapsed}
        aria-label={t(collapsed ? 'tm.expand' : 'tm.collapse', { name })}
        onClick={onToggle}
        data-testid="node-toggle"
      >
        <ChevronRight className={`transition-transform rtl:-scale-x-100 ${collapsed ? '' : 'rotate-90 rtl:scale-x-100'}`} />
      </Button>
      {titleNode}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="size-7" aria-label={t('tm.addTaskTo', { name })} onClick={onPlus} data-testid="node-add">
            <Plus />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('tm.addTaskTo', { name })}</TooltipContent>
      </Tooltip>
      {onAddProject && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground"
              aria-label={t('project.addTo', { name })}
              onClick={onAddProject}
              data-testid="node-add-project"
            >
              <FolderPlus />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('project.addTo', { name })}</TooltipContent>
        </Tooltip>
      )}
      {children}
    </div>
  )
}

function TaskTree({ tasks, all }: { tasks: Item[]; all: Item[] }) {
  return (
    <div className="grid gap-1.5">
      {tasks.map((task) => (
        <div key={task.id} className="grid gap-1.5">
          <DraggableRow item={task} showPath={false} />
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
  const [adding, setAdding] = useState(false)
  const [collapsed, setCollapsed] = useCollapsed(project.id)
  const tasks = items.filter((i) => i.projectId === project.id && i.parentId === null && !i.done)
  return (
    <Collapsible open={!collapsed} className="grid gap-2 ps-2" data-testid="project-block">
      <NodeHeader
        id={project.id}
        dropId={`project:${project.id}`}
        name={project.name}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        onPlus={() => {
          setCollapsed(false)
          setAdding(true)
        }}
        titleNode={
          <>
            <button type="button" className="text-start font-medium" onClick={() => openProject(project.id)}>
              {project.name}
            </button>
            <span className="text-xs text-muted-foreground">{t('tm.openTasks', { n: tasks.length })}</span>
            {project.archived && <span className="text-xs text-muted-foreground">· {t('project.archived')}</span>}
          </>
        }
      >
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
      </NodeHeader>
      <CollapsibleContent className="grid gap-2 ps-8">
        {adding && (
          <InlineAdd
            placeholder={t('project.addTask')}
            onAdd={(title) => actions.addItem(makeItem({ id: newId(), title, projectId: project.id }))}
            onClose={() => setAdding(false)}
          />
        )}
        <TaskTree tasks={tasks} all={items} />
      </CollapsibleContent>
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
    </Collapsible>
  )
}

function AreaBlock({ area, projects, items }: { area: Area; projects: Project[]; items: Item[] }) {
  const { t } = useI18n()
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [addingProject, setAddingProject] = useState(false)
  const [addingTask, setAddingTask] = useState(false)
  const [collapsed, setCollapsed] = useCollapsed(area.id)
  const areaTasks = items.filter((i) => i.projectId === null && i.areaId === area.id && i.parentId === null && !i.done)
  return (
    <Collapsible open={!collapsed} asChild>
      <section className="grid gap-3" data-testid="area-block">
        <div className="border-b pb-1">
          <NodeHeader
            id={area.id}
            dropId={`area:${area.id}`}
            name={area.name}
            collapsed={collapsed}
            onToggle={() => setCollapsed(!collapsed)}
            onPlus={() => {
              setCollapsed(false)
              setAddingTask(true)
            }}
            onAddProject={() => setAddingProject(true)}
            titleNode={<h2 className="text-lg font-semibold">{area.name}</h2>}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="ms-auto size-7" aria-label={area.name}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setRenaming(true)}>{t('common.rename')}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
                  {t('common.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </NodeHeader>
        </div>
        <CollapsibleContent className="grid gap-3">
          <div className="grid gap-2 ps-10" data-testid="area-tasks">
            {addingTask && (
              <InlineAdd
                placeholder={t('project.addTask')}
                onAdd={(title) => actions.addItem(makeItem({ id: newId(), title, areaId: area.id }))}
                onClose={() => setAddingTask(false)}
              />
            )}
            <TaskTree tasks={areaTasks} all={items} />
          </div>
          {projects.map((p) => (
            <ProjectBlock key={p.id} project={p} items={items} />
          ))}
        </CollapsibleContent>
        <NameDialog
          open={addingProject}
          onOpenChange={setAddingProject}
          title={t('project.add')}
          label={t('project.name')}
          onSubmit={(name) => {
            actions.addProject({ id: newId(), areaId: area.id, name })
            setAddingProject(false)
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
    </Collapsible>
  )
}

function LooseTasks({ items }: { items: Item[] }) {
  const { t } = useI18n()
  const [adding, setAdding] = useState(false)
  const [collapsed, setCollapsed] = useCollapsed('loose')
  const loose = items.filter((i) => i.projectId === null && !i.areaId && i.parentId === null && !i.done)
  return (
    <Collapsible open={!collapsed} asChild>
      <section className="grid gap-2" data-testid="loose-tasks">
        <div className="border-b pb-1">
          <NodeHeader
            id="loose"
            dropId="loose"
            name={t('tm.loose')}
            collapsed={collapsed}
            onToggle={() => setCollapsed(!collapsed)}
            onPlus={() => {
              setCollapsed(false)
              setAdding(true)
            }}
            titleNode={<h2 className="text-lg font-semibold">{t('tm.loose')}</h2>}
          />
        </div>
        <CollapsibleContent className="grid gap-2 ps-10">
          {adding && (
            <InlineAdd
              placeholder={t('project.addTask')}
              onAdd={(title) => actions.addItem(makeItem({ id: newId(), title }))}
              onClose={() => setAdding(false)}
            />
          )}
          <TaskTree tasks={loose} all={items} />
        </CollapsibleContent>
      </section>
    </Collapsible>
  )
}

export function ByProject() {
  const areas = useDb((db) => db.areas)
  const projects = useDb((db) => db.projects)
  const items = useDb((db) => db.items)

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
      <LooseTasks items={items} />
    </div>
  )
}
