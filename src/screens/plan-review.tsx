import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { closestCenter, DndContext, DragOverlay, KeyboardSensor, PointerSensor, pointerWithin, useSensor, useSensors, type CollisionDetection, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { toast } from 'sonner'
import { CandidatesPane } from '@/components/candidates-pane'
import { EstimateDialog } from '@/components/estimate-dialog'
import { PlanTimeline } from '@/components/plan-timeline'
import { ReviewPanel } from '@/components/review-panel'
import { useReviewBlock } from '@/components/use-review-block'
import { WeekHeader } from '@/components/week-header'
import { actions, newId } from '@/data/actions'
import { useDb } from '@/data/hooks'
import { store } from '@/data/store'
import { isPlannable } from '@/domain/items'
import { canAddBlock, capStatus } from '@/domain/plan'
import { isReviewDay } from '@/domain/review'
import { defaultPlanDate, weekDates, weekStartOf } from '@/domain/week'
import { useGcalEvents } from '@/integrations/gcal/hooks'
import { useI18n } from '@/i18n'
import type { DateStr } from '@/types'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const collision: CollisionDetection = (args) => {
  const within = pointerWithin(args)
  return within.length ? within : closestCenter(args)
}

export function PlanReviewScreen() {
  const { t } = useI18n()
  const params = useParams()
  const navigate = useNavigate()
  const date: DateStr =
    params.date && DATE_RE.test(params.date)
      ? params.date
      : defaultPlanDate(new Date(), store.getState().settings.ritual)
  const go = (d: DateStr) => navigate(`/plan/${d}`)
  useReviewBlock(date)
  useGcalEvents(weekDates(weekStartOf(date, store.getState().settings.weekStart)))
  const reviewDay = useDb((d) => isReviewDay(date, d.settings))
  const [pending, setPending] = useState<{ itemId: string; index?: number } | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const db = () => store.getState()
  const lockedNow = useDb((d) => d.plans[date]?.locked ?? false)
  const locked = () => db().plans[date]?.locked ?? false

  function requestAdd(itemId: string, index?: number) {
    const s = db()
    const item = s.items.find((i) => i.id === itemId)
    if (!item || !isPlannable(item, s.items)) return void toast.error(t('plan.notPlannable'))
    if (locked()) return void toast.error(t('plan.lockedHint'))
    if (!canAddBlock(s.plans[date], s.settings)) {
      return void toast.error(t('plan.capReached', { cap: capStatus(s.plans[date], s.settings).cap }))
    }
    setPending({ itemId, index })
  }

  function confirmLeftovers(ids: string[]) {
    let refused = 0
    for (const id of ids) {
      const before = db().plans[date]?.blocks.length ?? 0
      actions.addItemBlock(date, id, { id: newId() })
      if ((db().plans[date]?.blocks.length ?? 0) === before) refused++
    }
    if (refused) toast.error(t('plan.capReached', { cap: capStatus(db().plans[date], db().settings).cap }))
  }

  function onDragStart(e: DragStartEvent) {
    const item = db().items.find((i) => i.id === e.active.data.current?.itemId)
    const block = db().plans[date]?.blocks.find((b) => b.id === e.active.data.current?.blockId)
    const blockItem = block && db().items.find((i) => i.id === block.itemId)
    setDragging(item?.title ?? (block ? (blockItem?.title ?? t('plan.review')) : null))
  }

  function onDragEnd(e: DragEndEvent) {
    setDragging(null)
    const { active, over } = e
    if (!over) return
    const plan = db().plans[date]
    const ordered = [...(plan?.blocks ?? [])].sort((a, b) => a.rank - b.rank)
    const overId = String(over.id)
    const overBlockId = overId.startsWith('block-') ? overId.slice(6) : null
    const overIndex = overBlockId ? ordered.findIndex((b) => b.id === overBlockId) : undefined

    const itemId = active.data.current?.itemId as string | undefined
    const blockId = active.data.current?.blockId as string | undefined
    if (itemId) {
      if (overId === 'timeline-drop' || overBlockId) requestAdd(itemId, overIndex)
    } else if (blockId) {
      if (locked()) return
      if (overId === 'candidates-drop') actions.removeBlock(date, blockId)
      else if (overBlockId && overBlockId !== blockId && overIndex !== undefined) actions.moveBlock(date, blockId, overIndex)
    }
  }

  const pendingItem = pending && db().items.find((i) => i.id === pending.itemId)

  return (
    <div className="mx-auto grid max-w-6xl gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t('nav.plan')}</h1>
      <WeekHeader date={date} onNavigate={go} />
      <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
          <CandidatesPane date={date} locked={lockedNow} onAdd={(id) => requestAdd(id)} onConfirmLeftovers={confirmLeftovers} />
          <PlanTimeline date={date} />
        </div>
        <DragOverlay>
          {dragging && <div className="rounded-md border bg-card px-3 py-1.5 text-sm shadow-md">{dragging}</div>}
        </DragOverlay>
      </DndContext>
      {reviewDay && <ReviewPanel date={date} />}
      <EstimateDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        itemTitle={pendingItem?.title ?? ''}
        initial={pendingItem?.estimateMin ?? db().settings.defaultEstimateMin}
        onConfirm={(min) => {
          if (!pending) return
          const id = newId()
          actions.addItemBlock(date, pending.itemId, { id, estimateMin: min })
          if (pending.index !== undefined) actions.moveBlock(date, id, pending.index)
          setPending(null)
        }}
      />
    </div>
  )
}
