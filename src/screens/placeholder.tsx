import { useI18n, type MessageKey } from '@/i18n'

export function Placeholder({ titleKey }: { titleKey: MessageKey }) {
  const { t } = useI18n()
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{t(titleKey)}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('common.comingSoon')}</p>
    </div>
  )
}
