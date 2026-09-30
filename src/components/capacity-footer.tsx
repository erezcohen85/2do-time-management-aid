import { AlertTriangle, Check } from 'lucide-react'
import { capStatus } from '@/domain/plan'
import type { ScheduleResult } from '@/domain/schedule'
import { fromMin } from '@/domain/time'
import { useI18n } from '@/i18n'
import type { DayPlan, Settings } from '@/types'

export function CapacityFooter({ plan, schedule, settings }: { plan: DayPlan | undefined; schedule: ScheduleResult; settings: Settings }) {
  const { t, duration } = useI18n()
  const cap = capStatus(plan, settings)
  return (
    <div data-testid="capacity-footer" className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t pt-3 text-sm">
      <span className={cap.over ? 'font-semibold text-destructive' : 'font-semibold'} data-testid="capacity-count">
        {t('plan.footer.count', { count: cap.count, cap: cap.cap })}
      </span>
      {cap.count === 0 ? (
        <span className="text-muted-foreground">{t('plan.footer.empty')}</span>
      ) : (
        <>
          <span>{t('plan.footer.planned', { time: duration(schedule.totalMin) })}</span>
          {schedule.overflow ? (
            <span className="flex items-center gap-1 text-destructive" data-testid="capacity-overflow">
              <AlertTriangle className="size-4" />
              {t('plan.footer.overflow', { time: fromMin(schedule.endMin), limit: settings.overflowAfter })}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-muted-foreground" data-testid="capacity-fits">
              <Check className="size-4" />
              {t('plan.footer.fits')}
            </span>
          )}
        </>
      )}
    </div>
  )
}
