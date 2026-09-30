import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BellRing } from 'lucide-react'
import { useRitual } from '@/components/use-ritual'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useDb } from '@/data/hooks'
import { formatDate } from '@/domain/time'
import { useI18n } from '@/i18n'
import { ritualState } from '@/lib/ritual-state'
import { showNotification } from '@/timer/alerts'

/** In-tab planning reminder: banner plus a browser notification (once per day). */
export function RitualBanner() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const mode = useDb((db) => db.settings.ritual.mode)
  const { due, target, now } = useRitual()
  const today = formatDate(now)
  const message = t(mode === 'morning' ? 'ritual.banner.morning' : 'ritual.banner.evening')

  useEffect(() => {
    if (!due || ritualState.notified() === today) return
    ritualState.markNotified(today)
    showNotification(t('ritual.notify.title'), message)
  }, [due, today, message, t])

  if (!due) return null
  return (
    <Alert className="mx-4 mt-4 w-auto" data-testid="ritual-banner">
      <BellRing className="size-4" />
      <AlertDescription className="flex flex-wrap items-center gap-2">
        <span>{message}</span>
        <Button
          size="sm"
          onClick={() => {
            ritualState.markHandled(today)
            navigate(`/plan/${target}`)
          }}
        >
          {t('ritual.open')}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => ritualState.markHandled(today)}>
          {t('ritual.dismiss')}
        </Button>
      </AlertDescription>
    </Alert>
  )
}
