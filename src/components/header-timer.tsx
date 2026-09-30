import { Link } from 'react-router-dom'
import { Coffee, Pause, Timer } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import { displayMs, formatClock } from '@/timer/format'
import { useNow, useTimerState } from '@/timer/hooks'

/** Header mini-timer, shown on every screen while a timer exists. Click jumps to Today. */
export function HeaderTimer() {
  const { t } = useI18n()
  const state = useTimerState()
  const now = useNow(500)
  if (!state) return <div data-slot="header-timer" className="ms-auto" />
  const onBreak = state.phase === 'shortBreak' || state.phase === 'longBreak'
  return (
    <div data-slot="header-timer" className="ms-auto flex items-center gap-2">
      <Button asChild variant="ghost" size="sm" className="gap-2">
        <Link to="/today" aria-label={t('timer.mini')} data-testid="mini-timer">
          {state.status === 'paused' ? <Pause className="size-4" /> : onBreak ? <Coffee className="size-4" /> : <Timer className="size-4" />}
          <span className="font-mono tabular-nums" data-testid="mini-timer-digits">
            {formatClock(displayMs(state, now))}
          </span>
          <Badge variant="secondary">{t(`timer.mode.${state.mode}`)}</Badge>
        </Link>
      </Button>
    </div>
  )
}
