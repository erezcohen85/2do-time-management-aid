import { CloudOff } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import { gcal } from '@/integrations/gcal/client'
import { useGcalStatus } from '@/integrations/gcal/status'

/** Non-blocking Google Calendar problem banner with retry or reconnect. The local plan is unaffected. */
export function GcalBanner() {
  const { t } = useI18n()
  const { phase, error } = useGcalStatus()
  const needsReconnect = phase === 'reconnect' || error?.action === 'reconnect'
  if (!error && phase !== 'reconnect') return null
  return (
    <Alert variant={needsReconnect ? 'default' : 'destructive'} className="mx-4 mt-4 w-auto" data-testid="gcal-banner">
      <CloudOff className="size-4" />
      <AlertDescription className="flex flex-wrap items-center gap-2">
        <span>{needsReconnect ? t('gcal.banner.reconnect') : t('gcal.banner.error', { message: error?.message ?? '' })}</span>
        <span className="text-muted-foreground">{t('gcal.banner.local')}</span>
        {needsReconnect ? (
          <Button size="sm" onClick={() => void gcal().reconnect()} data-testid="gcal-reconnect">
            {t('gcal.reconnect')}
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => void gcal().retry()} data-testid="gcal-retry">
            {t('gcal.banner.retry')}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
