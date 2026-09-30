import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CalendarCheck, CloudUpload, GripVertical, Lock, LockOpen, Pin, PinOff, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { CapacityFooter } from '@/components/capacity-footer'
import { Timeline } from '@/components/timeline'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { actions } from '@/data/actions'
import { useDb } from '@/data/hooks'
import { capStatus } from '@/domain/plan'
import { schedule, type ScheduledBlock } from '@/domain/schedule'
import { parseDate } from '@/domain/time'
import { useI18n } from '@/i18n'
import { gcal } from '@/integrations/gcal/client'
import { useCalendarEvents } from '@/integrations/gcal/events-store'
import { useGcalStatus } from '@/integrations/gcal/status'
import { cn } from '@/lib/utils'
import type { DateStr } from '@/types'

function EstimateEditor({ value, onSave, disabled }: { value: number; onSave: (n: number) => void; disabled: boolean }) {
  const { t, duration } = useI18n()
  const [v, setV] = useState(String(value))
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setV(String(value)) }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 font-mono text-xs" disabled={disabled} aria-label={t('plan.estimate')}>
          {duration(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-44">
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const n = Math.round(Number(v))
            if (Number.isFinite(n) && n >= 5 && n <= 720) {
              onSave(n)
              setOpen(false)
            }
          }}
        >
          <Label htmlFor="blk-est">{t('plan.estimate.label')}</Label>
          <Input id="blk-est" type="number" min={5} max={720} value={v} onChange={(e) => setV(e.target.value)} autoFocus />
          <Button type="submit" size="sm">
            {t('common.save')}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  )
}

function PinEditor({ pinned, fallback, onPin, disabled }: { pinned?: string; fallback: string; onPin: (t: string | undefined) => void; disabled: boolean }) {
  const { t } = useI18n()
  const [v, setV] = useState(pinned ?? fallback)
  const [open, setOpen] = useState(false)
  const commit = (time: string | undefined) => {
    onPin(time)
    setOpen(false)
  }
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setV(pinned ?? fallback) }}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('size-7', pinned && 'text-primary')}
          disabled={disabled}
          aria-label={pinned ? t('plan.pinnedAt', { time: pinned }) : t('plan.pin')}
          aria-pressed={!!pinned}
        >
          {pinned ? <Pin /> : <PinOff className="opacity-50" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48">
        <div className="grid gap-2">
          <Label htmlFor="pin-time">{t('plan.pinTime')}</Label>
          <Input id="pin-time" type="time" value={v} onChange={(e) => setV(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => v && commit(v)}>
              {t('plan.pin.confirm')}
            </Button>
            {pinned && (
              <Button size="sm" variant="outline" onClick={() => commit(undefined)}>
                {t('plan.unpin')}
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function BlockRow({ sb, date, locked, index }: { sb: ScheduledBlock; date: DateStr; locked: boolean; index: number }) {
  const { t } = useI18n()
  const item = useDb((db) => db.items.find((i) => i.id === sb.block.itemId))
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `block-${sb.block.id}`,
    data: { blockId: sb.block.id },
    disabled: locked,
  })
  const b = sb.block
  const title = b.kind === 'review' ? t('plan.review') : (item?.title ?? '…')
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-testid="plan-block"
      data-block-id={b.id}
      data-done={b.done}
      className={cn(
        'flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-sm',
        b.done && 'bg-block-done text-muted-foreground',
        sb.conflict && 'border-destructive',
        isDragging && 'opacity-60 shadow-md',
      )}
    >
      <button type="button" className="cursor-grab touch-none text-muted-foreground disabled:cursor-not-allowed" disabled={locked} aria-label={t('plan.drag')} {...attributes} {...listeners}>
        <GripVertical className="size-4" />
      </button>
      <span className="w-5 shrink-0 font-mono text-xs text-muted-foreground" data-testid="block-rank">
        {index + 1}
      </span>
      {b.kind === 'review' && <CalendarCheck className="size-4 shrink-0 text-muted-foreground" />}
      <span className={cn('min-w-0 flex-1 truncate', b.done && 'line-through')}>{title}</span>
      {sb.conflict && (
        <Badge variant="destructive" title={t('plan.conflict')}>
          !
        </Badge>
      )}
      <EstimateEditor value={b.estimateMin} disabled={locked} onSave={(n) => actions.setBlockEstimate(date, b.id, n)} />
      <PinEditor pinned={b.pinnedStart} fallback={sb.start} disabled={locked} onPin={(time) => actions.pinBlock(date, b.id, time)} />
      <Button variant="ghost" size="icon" className="size-7" disabled={locked} aria-label={t('plan.remove')} onClick={() => actions.removeBlock(date, b.id)}>
        <X />
      </Button>
    </div>
  )
}

function PushButton({ date }: { date: DateStr }) {
  const { t } = useI18n()
  const plan = useDb((db) => db.plans[date])
  const mode = useDb((db) => db.settings.gcal.syncMode)
  const status = useGcalStatus()
  const can = status.phase === 'connected' && (!!plan?.blocks.length || !!plan?.orphanedEventIds?.length)
  const label = status.syncing ? t('gcal.syncing') : plan?.pushed && mode === 'manual' ? t('gcal.syncNow') : t('gcal.push')
  return (
    <div className="flex items-center gap-2">
      {plan?.pushed && (
        <Badge variant="secondary" data-testid="pushed-badge">
          {t('gcal.pushedBadge')}
        </Badge>
      )}
      <Button
        size="sm"
        disabled={!can || status.syncing}
        title={status.phase === 'connected' ? undefined : t('gcal.pushDisabled')}
        data-testid="gcal-push"
        onClick={async () => {
          const r = await gcal().pushDay(date)
          if (r) toast.success(t('gcal.pushed'))
        }}
      >
        <CloudUpload /> {label}
      </Button>
    </div>
  )
}

export function PlanTimeline({ date }: { date: DateStr }) {
  const { t, fmt } = useI18n()
  const plan = useDb((db) => db.plans[date])
  const settings = useDb((db) => db.settings)
  const events = useCalendarEvents(date)
  const { setNodeRef, isOver } = useDroppable({ id: 'timeline-drop' })
  const locked = plan?.locked ?? false
  const result = schedule(plan?.blocks ?? [], events, { dayStart: settings.dayStart, overflowAfter: settings.overflowAfter })
  const rankIndex = new Map([...(plan?.blocks ?? [])].sort((a, b) => a.rank - b.rank).map((b, i) => [b.id, i]))
  const cap = capStatus(plan, settings)

  return (
    <div ref={setNodeRef} data-testid="plan-timeline" className={cn('grid content-start gap-3 rounded-lg border p-3', isOver && 'bg-accent/50')}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">
          {fmt(parseDate(date), { weekday: 'short', day: '2-digit', month: 'short' })}
        </h2>
        <span className="text-xs text-muted-foreground">{t('plan.dayStart', { time: settings.dayStart })}</span>
        {locked && (
          <Badge variant="secondary" className="gap-1">
            <Lock className="size-3" /> {t('plan.locked')}
          </Badge>
        )}
        <Button variant="outline" size="sm" className="ms-auto" onClick={() => actions.setLocked(date, !locked)} aria-pressed={locked}>
          {locked ? <LockOpen /> : <Lock />}
          {locked ? t('plan.unlock') : t('plan.lock')}
        </Button>
      </div>
      {locked && (
        <Alert>
          <AlertDescription>{t('plan.lockedHint')}</AlertDescription>
        </Alert>
      )}
      {cap.over && (
        <Alert variant="destructive" data-testid="cap-over">
          <AlertDescription>{t('plan.capOver', { cap: cap.cap })}</AlertDescription>
        </Alert>
      )}
      <SortableContext
        items={result.blocks.map((b) => `block-${b.block.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <Timeline
          blocks={result.blocks}
          events={events}
          renderBlock={(sb) => <BlockRow sb={sb} date={date} locked={locked} index={rankIndex.get(sb.block.id) ?? 0} />}
        />
      </SortableContext>
      {result.blocks.length === 0 && (
        <p className="flex items-center gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          <Trash2 className="hidden" />
          {t('plan.dropHere')}
        </p>
      )}
      <CapacityFooter plan={plan} schedule={result} settings={settings} />
      <div className="flex justify-end">
        <PushButton date={date} />
      </div>
    </div>
  )
}
