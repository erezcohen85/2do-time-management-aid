import { useMemo, useState } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { ChevronRight, GripVertical, Lock, Plus } from 'lucide-react'
import { GradeDot } from '@/components/grade-chips'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { useDb } from '@/data/hooks'
import { locationLabel, locationOf } from '@/domain/location'
import { candidates, type Candidate } from '@/domain/plan'
import { parseDate } from '@/domain/time'
import { useI18n } from '@/i18n'
import { useDetail } from '@/lib/detail-state'
import { cn } from '@/lib/utils'
import { GRADES, type DateStr } from '@/types'

function CandidateRow({
  c, onAdd, locked, selectable, selected, onSelect,
}: {
  c: Candidate
  onAdd: (itemId: string) => void
  locked: boolean
  selectable?: boolean
  selected?: boolean
  onSelect?: (v: boolean) => void
}) {
  const { t, fmt, duration } = useI18n()
  const projects = useDb((db) => db.projects)
  const items = useDb((db) => db.items)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `cand-${c.item.id}`,
    data: { itemId: c.item.id },
    disabled: c.blocked || locked,
  })
  const areas = useDb((db) => db.areas)
  const path = locationLabel(locationOf(c.item, projects, areas))
  const { openItem } = useDetail()
  const parent = c.item.parentId ? items.find((i) => i.id === c.item.parentId) : undefined
  const blocker = c.item.waitingOnId ? items.find((i) => i.id === c.item.waitingOnId) : undefined

  return (
    <div
      ref={setNodeRef}
      data-testid="candidate"
      data-item-id={c.item.id}
      data-blocked={c.blocked}
      className={cn('flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-sm', c.blocked && 'opacity-50', isDragging && 'opacity-40')}
    >
      {selectable ? (
        <Checkbox checked={selected} aria-label={t('plan.addSelected', { title: c.item.title })} onCheckedChange={(v) => onSelect?.(v === true)} />
      ) : (
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground disabled:cursor-not-allowed"
          aria-label={t('plan.drag')}
          disabled={c.blocked || locked}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      )}
      {c.item.grade && <GradeDot grade={c.item.grade} />}
      <div className="min-w-0 flex-1">
        <button type="button" className="block max-w-full truncate text-start hover:underline" onClick={() => openItem(c.item.id)}>
          {c.item.title}
        </button>
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          {parent && <span>↳ {parent.title}</span>}
          {path && <span>{path}</span>}
          {c.item.estimateMin && <span>{duration(c.item.estimateMin)}</span>}
          {c.item.due && <span>{fmt(parseDate(c.item.due), { day: 'numeric', month: 'short' })}</span>}
        </div>
      </div>
      {c.item.carryOver > 0 && <Badge variant="outline">↻{c.item.carryOver}</Badge>}
      {c.blocked && blocker ? (
        <span title={t('plan.blockedHint', { title: blocker.title })}>
          <Lock className="size-4 text-muted-foreground" aria-label={t('plan.blockedHint', { title: blocker.title })} />
        </span>
      ) : (
        <Button variant="ghost" size="icon" className="size-7" disabled={locked} aria-label={t('plan.add', { title: c.item.title })} onClick={() => onAdd(c.item.id)}>
          <Plus />
        </Button>
      )}
    </div>
  )
}

function Group({
  id, title, hint, count, open, onOpenChange, children,
}: {
  id: string
  title: React.ReactNode
  hint?: string
  count: number
  open: boolean
  onOpenChange: (o: boolean) => void
  children: React.ReactNode
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange} data-testid={`cand-group-${id}`}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 py-1 text-start text-sm font-semibold">
        <ChevronRight className="size-4 transition-transform rtl:-scale-x-100 [[data-state=open]>&]:rotate-90 rtl:[[data-state=open]>&]:scale-x-100" />
        {title}
        <span className="font-normal text-muted-foreground">({count})</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="grid gap-1.5 pb-2">
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}

export function CandidatesPane({
  date, locked, onAdd, onConfirmLeftovers,
}: {
  date: DateStr
  locked: boolean
  onAdd: (itemId: string) => void
  onConfirmLeftovers: (itemIds: string[]) => void
}) {
  const { t } = useI18n()
  const items = useDb((db) => db.items)
  const plans = useDb((db) => db.plans)
  const [filter, setFilter] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>({ left: true, due: true, A: true })
  const [unchecked, setUnchecked] = useState<Set<string>>(new Set())
  const { setNodeRef, isOver } = useDroppable({ id: 'candidates-drop' })
  const c = useMemo(() => candidates(items, plans, date, filter), [items, plans, date, filter])
  const selected = c.leftovers.filter((l) => !l.blocked && !unchecked.has(l.item.id))
  const total = c.leftovers.length + c.due.length + GRADES.reduce((n, g) => n + c.byGrade[g].length, 0)
  const toggle = (k: string) => (o: boolean) => setOpen((s) => ({ ...s, [k]: o }))

  return (
    <div ref={setNodeRef} data-testid="candidates-pane" className={cn('grid content-start gap-2 rounded-lg border p-3', isOver && 'bg-accent')}>
      <h2 className="text-lg font-semibold">{t('plan.candidates')}</h2>
      <Input aria-label={t('plan.filter')} placeholder={t('plan.filter')} value={filter} onChange={(e) => setFilter(e.target.value)} />
      {total === 0 && <p className="text-xs text-muted-foreground">{t('plan.noCandidates')}</p>}
      {c.leftovers.length > 0 && (
        <Group id="leftovers" title={t('plan.leftovers')} hint={t('plan.leftovers.hint')} count={c.leftovers.length} open={open.left} onOpenChange={toggle('left')}>
          {c.leftovers.map((l) => (
            <CandidateRow
              key={l.item.id}
              c={l}
              onAdd={onAdd}
              locked={locked}
              selectable={!l.blocked}
              selected={!unchecked.has(l.item.id)}
              onSelect={(v) =>
                setUnchecked((s) => {
                  const n = new Set(s)
                  if (v) n.delete(l.item.id)
                  else n.add(l.item.id)
                  return n
                })
              }
            />
          ))}
          <Button size="sm" disabled={locked || selected.length === 0} onClick={() => onConfirmLeftovers(selected.map((s) => s.item.id))}>
            {t('plan.leftovers.confirm', { n: selected.length })}
          </Button>
        </Group>
      )}
      {c.due.length > 0 && (
        <Group id="due" title={t('plan.due')} count={c.due.length} open={open.due} onOpenChange={toggle('due')}>
          {c.due.map((x) => (
            <CandidateRow key={x.item.id} c={x} onAdd={onAdd} locked={locked} />
          ))}
        </Group>
      )}
      {GRADES.map((g) =>
        c.byGrade[g].length > 0 ? (
          <Group
            key={g}
            id={g}
            title={
              <span className="flex items-center gap-1.5">
                <GradeDot grade={g} />
                {t('plan.grade', { grade: g })}
              </span>
            }
            count={c.byGrade[g].length}
            open={open[g] ?? false}
            onOpenChange={toggle(g)}
          >
            {c.byGrade[g].map((x) => (
              <CandidateRow key={x.item.id} c={x} onAdd={onAdd} locked={locked} />
            ))}
          </Group>
        ) : null,
      )}
    </div>
  )
}
