import type { ReactNode } from 'react'
import type { CalendarEvent, ScheduledBlock } from '@/domain/schedule'
import { fromMin, toMin } from '@/domain/time'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'

type Row =
  | { kind: 'block'; startMin: number; sb: ScheduledBlock }
  | { kind: 'event'; startMin: number; event: CalendarEvent }
  | { kind: 'now'; startMin: number }

/**
 * Shared by Plan and Today: blocks and calendar events in time order, optionally with
 * a live "now" line. The caller renders each block (so Plan and Today add their own controls).
 */
export function Timeline({
  blocks, events, nowMin, renderBlock,
}: {
  blocks: ScheduledBlock[]
  events: CalendarEvent[]
  nowMin?: number
  renderBlock: (sb: ScheduledBlock) => ReactNode
}) {
  const { t } = useI18n()
  const rows: Row[] = [
    ...blocks.map((sb) => ({ kind: 'block' as const, startMin: sb.startMin, sb })),
    ...events.map((event) => ({ kind: 'event' as const, startMin: toMin(event.start), event })),
  ].sort((a, b) => a.startMin - b.startMin)
  if (nowMin !== undefined) {
    const at = rows.findIndex((r) => r.startMin > nowMin)
    rows.splice(at < 0 ? rows.length : at, 0, { kind: 'now', startMin: nowMin })
  }

  return (
    <ol className="grid gap-1.5" data-testid="timeline">
      {rows.map((r) => {
        if (r.kind === 'now') {
          return (
            <li key="now" data-testid="now-line" className="flex items-center gap-2 text-xs text-now-line" aria-label={fromMin(r.startMin)}>
              <span className="font-mono tabular-nums">{fromMin(r.startMin)}</span>
              <span className="h-px flex-1 bg-now-line" />
              <span className="font-semibold uppercase">{t('today.now')}</span>
            </li>
          )
        }
        if (r.kind === 'event') {
          return (
            <li key={`e-${r.event.id}`} data-testid="calendar-event" className="flex items-center gap-2">
              <span className="w-12 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{r.event.start}</span>
              <div className={cn('flex flex-1 items-center gap-2 rounded-md bg-block-calendar px-3 py-1.5 text-sm text-secondary-foreground')}>
                <span className="text-xs text-muted-foreground">{t('plan.calendarEvent')}</span>
                <span className="truncate">{r.event.title}</span>
                <span className="ms-auto font-mono text-xs tabular-nums text-muted-foreground">
                  {r.event.start}–{r.event.end}
                </span>
              </div>
            </li>
          )
        }
        return (
          <li key={r.sb.block.id} className="flex items-center gap-2" data-testid="timeline-block">
            <span className="w-12 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{r.sb.start}</span>
            <div className="min-w-0 flex-1">{renderBlock(r.sb)}</div>
          </li>
        )
      })}
    </ol>
  )
}
