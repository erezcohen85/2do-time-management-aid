import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { DraftInput } from '@/components/draft-fields'
import { DuePicker } from '@/components/due-picker'
import { ItemRow } from '@/components/item-row'
import { SmartFields } from '@/components/smart-fields'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { actions, makeItem, newId } from '@/data/actions'
import { useDb } from '@/data/hooks'
import { useI18n } from '@/i18n'
import { useDetail } from '@/lib/detail-state'
import type { Project } from '@/types'

function ProjectBody({ project }: { project: Project }) {
  const { t } = useI18n()
  const { close } = useDetail()
  const areas = useDb((db) => db.areas)
  const items = useDb((db) => db.items)
  const [v, setV] = useState('')
  const [deleting, setDeleting] = useState(false)
  const up = (patch: Partial<Omit<Project, 'id'>>) => actions.updateProject(project.id, patch)
  const tasks = items.filter((i) => i.projectId === project.id && i.parentId === null && !i.done)

  return (
    <div className="grid gap-5 px-4 pb-6" data-testid="project-detail">
      <div className="grid gap-1.5">
        <Label htmlFor="p-name">{t('project.name')}</Label>
        <DraftInput id="p-name" value={project.name} onCommit={(name) => name.trim() && up({ name: name.trim() })} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="p-area">{t('project.area')}</Label>
        <Select value={project.areaId} onValueChange={(areaId) => up({ areaId })}>
          <SelectTrigger id="p-area" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {areas.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="p-archive" checked={project.archived} onCheckedChange={(archived) => up({ archived })} />
        <Label htmlFor="p-archive">{t('project.archive')}</Label>
      </div>
      <Separator />
      <div className="grid gap-1.5">
        <Label htmlFor="p-due">{t('project.due')}</Label>
        <DuePicker id="p-due" value={project.due} onChange={(due) => up({ due })} />
      </div>
      <SmartFields
        idPrefix="project"
        smart={project.smart}
        due={project.due}
        onChange={(smart) => up({ smart })}
        onDueChange={(due) => up({ due })}
      />
      <Separator />
      <section className="grid gap-2">
        <h3 className="text-sm font-medium">{t('project.tasks')}</h3>
        {tasks.map((i) => (
          <ItemRow key={i.id} item={i} showPath={false} />
        ))}
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!v.trim()) return
            actions.addItem(makeItem({ id: newId(), title: v.trim(), projectId: project.id }))
            setV('')
          }}
        >
          <Plus className="size-4 text-muted-foreground" />
          <Input aria-label={t('project.addTask')} placeholder={t('project.addTask')} value={v} onChange={(e) => setV(e.target.value)} />
        </form>
      </section>
      <Separator />
      <div>
        <Button variant="destructive" onClick={() => setDeleting(true)}>
          <Trash2 /> {t('common.delete')}
        </Button>
      </div>
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={t('project.delete.title')}
        body={t('project.delete.body')}
        confirmLabel={t('common.delete')}
        onConfirm={() => {
          close()
          actions.deleteProject(project.id)
        }}
      />
    </div>
  )
}

export function ProjectDetail() {
  const { dir } = useI18n()
  const { projectId, close } = useDetail()
  const project = useDb((db) => db.projects.find((p) => p.id === projectId))
  return (
    <Sheet open={!!project} onOpenChange={(o) => !o && close()}>
      <SheetContent side={dir === 'rtl' ? 'left' : 'right'} className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader className="pe-12">
          <SheetTitle className="truncate">{project?.name}</SheetTitle>
          <SheetDescription className="sr-only">{project?.name}</SheetDescription>
        </SheetHeader>
        {project && <ProjectBody key={project.id} project={project} />}
      </SheetContent>
    </Sheet>
  )
}
