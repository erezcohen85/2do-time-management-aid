import { DraftInput, DraftNumber, DraftTextarea } from '@/components/draft-fields'
import { DuePicker } from '@/components/due-picker'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { smartProgress } from '@/domain/items'
import { useI18n } from '@/i18n'
import type { DateStr, Smart } from '@/types'

/** Optional SMART fields. The toggle is on when `smart` is defined (T is the due date). */
export function SmartFields({
  smart, due, onChange, onDueChange, idPrefix,
}: {
  smart: Smart | undefined
  due: DateStr | undefined
  onChange: (s: Smart | undefined) => void
  onDueChange: (d: DateStr | undefined) => void
  idPrefix: string
}) {
  const { t } = useI18n()
  const on = smart !== undefined
  const set = (patch: Partial<Smart>) => onChange({ ...smart, ...patch })
  const progress = smartProgress(smart)
  return (
    <div className="grid gap-3" data-testid="smart-fields">
      <div className="flex items-center gap-2">
        <Switch id={`${idPrefix}-smart`} checked={on} onCheckedChange={(v) => onChange(v ? (smart ?? {}) : undefined)} />
        <Label htmlFor={`${idPrefix}-smart`}>{t('smart.toggle')}</Label>
      </div>
      {on && (
        <div className="grid gap-3 rounded-md border p-3">
          <div className="grid gap-1.5">
            <Label htmlFor={`${idPrefix}-s`}>{t('smart.specific')}</Label>
            <DraftTextarea id={`${idPrefix}-s`} rows={2} value={smart.specific ?? ''} onCommit={(specific) => set({ specific })} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${idPrefix}-m`}>{t('smart.metric')}</Label>
            <DraftInput id={`${idPrefix}-m`} value={smart.metric ?? ''} onCommit={(metric) => set({ metric })} />
            <div className="flex items-center gap-2">
              <Label htmlFor={`${idPrefix}-cur`} className="text-xs text-muted-foreground">
                {t('smart.current')}
              </Label>
              <DraftNumber id={`${idPrefix}-cur`} className="w-24" value={smart.current} onCommit={(current) => set({ current })} />
              <Label htmlFor={`${idPrefix}-tgt`} className="text-xs text-muted-foreground">
                {t('smart.target')}
              </Label>
              <DraftNumber id={`${idPrefix}-tgt`} className="w-24" value={smart.target} onCommit={(target) => set({ target })} />
            </div>
            {progress !== null && (
              <div className="grid gap-1" data-testid="smart-progress">
                <Progress value={Math.round(progress * 100)} />
                <span className="text-xs text-muted-foreground">
                  {t('smart.progress', { current: smart.current ?? 0, target: smart.target ?? 0, metric: smart.metric ?? '' })}
                </span>
              </div>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${idPrefix}-a`}>{t('smart.achievable')}</Label>
            <DraftTextarea id={`${idPrefix}-a`} rows={2} value={smart.achievable ?? ''} onCommit={(achievable) => set({ achievable })} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${idPrefix}-r`}>{t('smart.relevant')}</Label>
            <DraftTextarea id={`${idPrefix}-r`} rows={2} value={smart.relevant ?? ''} onCommit={(relevant) => set({ relevant })} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${idPrefix}-t`}>{t('smart.time')}</Label>
            <DuePicker id={`${idPrefix}-t`} value={due} onChange={onDueChange} />
          </div>
        </div>
      )}
    </div>
  )
}
