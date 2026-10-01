import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDb } from '@/data/hooks'
import { score } from '@/domain/plan'
import { addDays, parseDate, todayStr } from '@/domain/time'
import { isoWeekNumber, visibleDates, weekDates, weekStartOf } from '@/domain/week'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'
import type { DateStr } from '@/types'

export function WeekHeader({ date, onNavigate }: { date: DateStr; onNavigate: (d: DateStr) => void }) {
  const { t, fmt } = useI18n()
  const weekStartDay = useDb((db) => db.settings.weekStart)
  const visibleDays = useDb((db) => db.settings.visibleDays)
  const plans = useDb((db) => db.plans)
  const today = todayStr()
  const start = weekStartOf(date, weekStartDay)
  const end = weekDates(start)[6]
  const range = `${fmt(parseDate(start), { day: 'numeric', month: 'short' })} – ${fmt(parseDate(end), { day: 'numeric', month: 'short', year: 'numeric' })}`
  const days = visibleDates(start, visibleDays)

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" aria-label={t('plan.prevWeek')} onClick={() => onNavigate(addDays(date, -7))}>
          <ChevronLeft className="rtl:rotate-180" />
        </Button>
        <h2 className="min-w-56 text-center text-sm font-medium" data-testid="week-label">
          {t('plan.week', { n: isoWeekNumber(start), range })}
        </h2>
        <Button variant="outline" size="icon" aria-label={t('plan.nextWeek')} onClick={() => onNavigate(addDays(date, 7))}>
          <ChevronRight className="rtl:rotate-180" />
        </Button>
        <Button variant="outline" onClick={() => onNavigate(today)}>
          {t('plan.thisWeek')}
        </Button>
      </div>
      <Tabs value={date} onValueChange={onNavigate}>
        <TabsList className="h-auto w-full flex-wrap justify-start">
          {days.map((d) => {
            const s = score(plans[d])
            const dt = parseDate(d)
            return (
              <TabsTrigger key={d} value={d} aria-controls={undefined} data-testid={`day-tab-${d}`} title={d === today ? t('plan.today') : undefined} className={cn('flex-col gap-0.5 px-3 py-1.5', d === today && 'font-bold')}>
                <span className="flex items-center gap-1 text-xs">
                  {d === today && <span aria-hidden className="size-1.5 rounded-full bg-primary" />}
                  {fmt(dt, { weekday: 'short' })}
                </span>
                <span className="flex items-center gap-1 text-sm">
                  {fmt(dt, { day: 'numeric' })}
                  {s.total > 0 && (
                    <Badge variant="secondary" className="px-1.5 text-[10px]" title={t('plan.dayScore', s)} data-testid={`day-score-${d}`}>
                      {s.done}/{s.total}
                    </Badge>
                  )}
                </span>
              </TabsTrigger>
            )
          })}
        </TabsList>
      </Tabs>
    </div>
  )
}
