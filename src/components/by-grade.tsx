import { useState } from 'react'
import {
  closestCenter, DndContext, KeyboardSensor, PointerSensor, useDroppable, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronRight } from 'lucide-react'
import { GradeDot } from '@/components/grade-chips'
import { ItemRow } from '@/components/item-row'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { actions } from '@/data/actions'
import { useDb } from '@/data/hooks'
import { rankedByGrade } from '@/domain/items'
import { useI18n } from '@/i18n'
import { GRADES, type Grade, type Item } from '@/types'

function SortableRow({ item }: { item: Item }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { grade: item.grade },
  })
  return (
    <ItemRow
      item={item}
      showRank
      dragHandle={{ ...attributes, ...listeners }}
      rowRef={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      dragging={isDragging}
    />
  )
}

function GradeGroup({ grade, items, open, onOpenChange }: {
  grade: Grade
  items: Item[]
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { t } = useI18n()
  const { setNodeRef, isOver } = useDroppable({ id: `grade-${grade}` })
  return (
    <Collapsible open={open} onOpenChange={onOpenChange} data-testid={`grade-group-${grade}`}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 py-1 text-start text-lg font-semibold">
        <ChevronRight className="size-4 transition-transform rtl:-scale-x-100 [[data-state=open]>&]:rotate-90 rtl:[[data-state=open]>&]:rotate-90" />
        <GradeDot grade={grade} className="size-2.5" />
        <span>{grade}</span>
        <span className="text-sm font-normal text-muted-foreground">
          {t(`grade.${grade}`)} ({items.length})
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div ref={setNodeRef} className={`grid gap-1.5 rounded-md py-1 ${isOver ? 'bg-accent' : ''}`}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            {items.map((i) => (
              <SortableRow key={i.id} item={i} />
            ))}
          </SortableContext>
          {items.length === 0 && <p className="px-2 py-1 text-xs text-muted-foreground">{t('tm.group.empty', { grade })}</p>}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function ByGrade() {
  const { t } = useI18n()
  const items = useDb((db) => db.items)
  const [open, setOpen] = useState<Record<string, boolean>>({ A: true, B: true, C: false, D: false, E: false, done: false })
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const overId = String(over.id)
    if (overId.startsWith('grade-')) {
      const grade = overId.slice(6) as Grade
      actions.moveInGrade(String(active.id), grade, rankedByGrade(items, grade).length)
      return
    }
    const overItem = items.find((i) => i.id === overId)
    if (!overItem?.grade) return
    const list = rankedByGrade(items, overItem.grade)
    actions.moveInGrade(String(active.id), overItem.grade, list.findIndex((i) => i.id === overId))
  }

  const done = items.filter((i) => i.done).sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''))

  return (
    <div className="grid gap-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        {GRADES.map((g) => (
          <GradeGroup
            key={g}
            grade={g}
            items={rankedByGrade(items, g)}
            open={open[g]}
            onOpenChange={(o) => setOpen((s) => ({ ...s, [g]: o }))}
          />
        ))}
      </DndContext>
      <Collapsible open={open.done} onOpenChange={(o) => setOpen((s) => ({ ...s, done: o }))} data-testid="done-group">
        <CollapsibleTrigger className="flex w-full items-center gap-2 py-1 text-start text-lg font-semibold">
          <ChevronRight className="size-4 transition-transform rtl:-scale-x-100 [[data-state=open]>&]:rotate-90 rtl:[[data-state=open]>&]:rotate-90" />
          {t('tm.done')}
          <span className="text-sm font-normal text-muted-foreground">({done.length})</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="grid gap-1.5 py-1">
          {done.map((i) => (
            <ItemRow key={i.id} item={i} />
          ))}
          {done.length === 0 && <p className="px-2 py-1 text-xs text-muted-foreground">{t('tm.done.empty')}</p>}
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
