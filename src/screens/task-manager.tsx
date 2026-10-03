import { useState } from 'react'
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, pointerWithin, useSensor, useSensors, type CollisionDetection, type DragEndEvent } from '@dnd-kit/core'
import { Plus, Search } from 'lucide-react'
import { ByGrade } from '@/components/by-grade'
import { ByProject } from '@/components/by-project'
import { UngradedInbox } from '@/components/ungraded-inbox'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { NameDialog } from '@/components/name-dialog'
import { actions, newId } from '@/data/actions'
import { useDb } from '@/data/hooks'
import { store } from '@/data/store'
import { useI18n } from '@/i18n'
import { ui } from '@/lib/ui-store'

type View = 'grade' | 'project'

const collision: CollisionDetection = (args) => {
  const within = pointerWithin(args)
  return within.length ? within : closestCenter(args)
}

export function TaskManagerScreen() {
  const { t } = useI18n()
  const [view, setView] = useState<View>(() => (localStorage.getItem('2do.tm.view') === 'project' ? 'project' : 'grade'))
  const [addingArea, setAddingArea] = useState(false)
  const empty = useDb((db) => db.items.length === 0 && db.areas.length === 0)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  )

  /** Drop a task on an area, a project or "Loose tasks" to (re)assign it. */
  function onAssign(e: DragEndEvent) {
    const id = e.active.data.current?.itemId as string | undefined
    const over = e.over ? String(e.over.id) : ''
    if (!id || !store.getState().items.some((i) => i.id === id)) return
    if (over.startsWith('project:')) actions.moveItemToProject(id, over.slice(8))
    else if (over.startsWith('area:')) actions.moveItemToArea(id, over.slice(5))
    else if (over === 'loose') actions.moveItemToArea(id, null)
  }

  const changeView = (v: View) => {
    setView(v)
    localStorage.setItem('2do.tm.view', v)
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t('nav.tasks')}</h1>
        {view === 'project' && (
          <Button variant="outline" size="sm" onClick={() => setAddingArea(true)} data-testid="add-area">
            <Plus /> {t('area.add')}
          </Button>
        )}
        <span className="me-auto" />
        <ToggleGroup
          type="single"
          variant="outline"
          value={view}
          onValueChange={(v) => v && changeView(v as View)}
          aria-label={t('nav.tasks')}
        >
          <ToggleGroupItem value="project">{t('tm.view.project')}</ToggleGroupItem>
          <ToggleGroupItem value="grade">{t('tm.view.grade')}</ToggleGroupItem>
        </ToggleGroup>
        <Button variant="outline" size="icon" aria-label={t('tm.search')} onClick={() => ui.open('search')}>
          <Search />
        </Button>
        <Button onClick={() => ui.open('quickAdd')}>
          <Plus /> {t('tm.add')}
        </Button>
      </div>
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
      {empty && <p className="text-sm text-muted-foreground">{t('tm.empty')}</p>}
      {view === 'grade' ? (
        <>
          <UngradedInbox />
          <ByGrade />
        </>
      ) : (
        <DndContext sensors={sensors} collisionDetection={collision} onDragEnd={onAssign}>
          <ByProject />
        </DndContext>
      )}
    </div>
  )
}
