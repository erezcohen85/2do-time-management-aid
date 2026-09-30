import { Link } from 'react-router-dom'
import { AlertTriangle, CalendarCheck, Play } from 'lucide-react'
import { toast } from 'sonner'
import { CarryOverPool } from '@/components/carryover-pool'
import { useReviewBlock } from '@/components/use-review-block'
import { Timeline } from '@/components/timeline'
import { TimerPanel } from '@/components/timer-panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { actions } from '@/data/actions'
import { useDb } from '@/data/hooks'
import { drift } from '@/domain/drift'
import { canTick, isOutOfOrder, score, topUnfinished } from '@/domain/plan'
import { schedule, type ScheduledBlock } from '@/domain/schedule'
import { formatMinutes, minutesOfDay, parseDate, todayStr } from '@/domain/time'
import { useI18n } from '@/i18n'
import { useCalendarEvents } from '@/integrations/gcal/events-store'
import { useGcalEvents } from '@/integrations/gcal/hooks'
import { ensureNotificationPermission } from '@/timer/alerts'
import { timerController, useNow } from '@/timer/hooks'
import { timerPrefs } from '@/timer/prefs'
import { cn } from '@/lib/utils'

export function TodayScreen() {
  const { t, fmt } = useI18n()
  const now = useNow(15000)
  const nowDate = new Date(now)
  const date = todayStr(nowDate)
  useReviewBlock(date)
  useGcalEvents([date])
  const plan = useDb((db) => db.plans[date])
  const items = useDb((db) => db.items)
  const settings = useDb((db) => db.settings)
  const events = useCalendarEvents(date)

  const result = schedule(plan?.blocks ?? [], events, { dayStart: settings.dayStart, overflowAfter: settings.overflowAfter })
  const s = score(plan)
  const d = drift(result, minutesOfDay(nowDate))
  const top = topUnfinished(plan)
  const titleOf = (b: ScheduledBlock['block']) => (b.kind === 'review' ? t('today.review') : (items.find((i) => i.id === b.itemId)?.title ?? '…'))

  function onTick(blockId: string, checked: boolean) {
    if (!canTick(plan, blockId, settings)) {
      toast.error(t('today.hardOrder', { top: top ? titleOf(top) : '' }))
      return
    }
    if (checked && isOutOfOrder(plan, blockId) && top) toast(t('today.nudge', { top: titleOf(top) }))
    actions.setBlockDone(date, blockId, checked)
  }

  function startTimer(itemId?: string) {
    if (settings.timer.notify) void ensureNotificationPermission()
    const p = timerPrefs.get()
    timerController().start({ mode: p.mode, itemId, presetId: p.presetId, countdownMin: p.countdownMin })
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('today.title')} · {fmt(parseDate(date), { weekday: 'short', day: '2-digit', month: 'short' })}
        </h1>
        {s.total > 0 && (
          <span className="text-sm text-muted-foreground" data-testid="today-score">
            {t('today.done', s)}
          </span>
        )}
        {d.kind === 'behind' && (
          <Badge variant="destructive" className="gap-1" data-testid="drift">
            <AlertTriangle className="size-3" /> {t('today.behind', { n: d.minutes })}
          </Badge>
        )}
        {d.kind === 'ahead' && (
          <Badge variant="secondary" data-testid="drift">
            {t('today.ahead', { n: d.minutes })}
          </Badge>
        )}
        {d.kind === 'onTrack' && (
          <Badge variant="outline" data-testid="drift">
            {t('today.onTrack')}
          </Badge>
        )}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <section className="grid content-start gap-3 rounded-lg border p-3" data-testid="today-timeline">
          {result.blocks.length === 0 && events.length === 0 ? (
            <div className="grid justify-items-start gap-2">
              <p className="text-sm text-muted-foreground">{t('today.empty')}</p>
              <Button asChild variant="outline" size="sm">
                <Link to={`/plan/${date}`}>{t('today.planIt')}</Link>
              </Button>
            </div>
          ) : (
            <Timeline
              blocks={result.blocks}
              events={events}
              nowMin={minutesOfDay(nowDate)}
              renderBlock={(sb) => {
                const b = sb.block
                const isTop = top?.id === b.id
                const hardLocked = settings.ivyOrder === 'hard' && !b.done && !isTop
                return (
                  <div
                    data-testid="today-block"
                    data-block-id={b.id}
                    data-current={isTop}
                    className={cn(
                      'flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm',
                      b.done ? 'bg-block-done text-muted-foreground' : 'bg-card',
                      isTop && 'border-primary ring-1 ring-primary',
                    )}
                  >
                    <Checkbox
                      checked={b.done}
                      disabled={hardLocked}
                      aria-label={t('today.tick', { title: titleOf(b) })}
                      onCheckedChange={(v) => onTick(b.id, v === true)}
                    />
                    <span className="w-5 shrink-0 font-mono text-xs text-muted-foreground">
                      {[...(plan?.blocks ?? [])].sort((x, y) => x.rank - y.rank).findIndex((x) => x.id === b.id) + 1}
                    </span>
                    {b.kind === 'review' && <CalendarCheck className="size-4 shrink-0 text-muted-foreground" />}
                    <span className={cn('min-w-0 flex-1 truncate', b.done && 'line-through')}>{titleOf(b)}</span>
                    {isTop && <Badge>{t('today.current')}</Badge>}
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">{formatMinutes(b.estimateMin)}</span>
                    {!b.done && (
                      <Button variant="ghost" size="icon" className="size-7" aria-label={t('today.start', { title: titleOf(b) })} onClick={() => startTimer(b.itemId)}>
                        <Play />
                      </Button>
                    )}
                  </div>
                )
              }}
            />
          )}
          <CarryOverPool date={date} />
        </section>
        <TimerPanel />
      </div>
    </div>
  )
}
