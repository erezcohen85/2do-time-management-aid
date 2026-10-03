import { useEffect, useState, type ReactNode } from 'react'
import { Download, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { actions, newId } from '@/data/actions'
import { store } from '@/data/store'
import { buildCsv } from '@/domain/export'
import { todayStr } from '@/domain/time'
import { downloadText } from '@/lib/download'
import { useDb } from '@/data/hooks'
import { orderDays } from '@/domain/week'
import { useI18n, type MessageKey } from '@/i18n'
import { ui } from '@/lib/ui-store'
import { gcal } from '@/integrations/gcal/client'
import { useGcalStatus } from '@/integrations/gcal/status'
import { ensureNotificationPermission } from '@/timer/alerts'
import type { Screen, Settings } from '@/types'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">{children}</CardContent>
    </Card>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[14rem_1fr] sm:items-center">
      <Label htmlFor={htmlFor}>{label}</Label>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

function Pick<T extends string>({
  id, value, options, onChange,
}: { id?: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger id={id} className="w-full sm:w-80">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function NumberField({
  id, value, min = 1, max = 600, onChange, className = 'w-24', label,
}: { id?: string; label?: string; value: number; min?: number; max?: number; onChange: (n: number) => void; className?: string }) {
  // Keep the raw text locally so the field can be cleared and retyped; only valid numbers are committed.
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <Input
      id={id}
      aria-label={label}
      type="number"
      inputMode="numeric"
      className={className}
      min={min}
      max={max}
      value={draft ?? String(value)}
      onChange={(e) => {
        setDraft(e.target.value)
        const n = Math.round(Number(e.target.value))
        if (e.target.value !== '' && Number.isFinite(n) && n >= min && n <= max) onChange(n)
      }}
      onBlur={() => setDraft(null)}
    />
  )
}

function TimeField({ id, value, onChange }: { id?: string; value: string; onChange: (v: string) => void }) {
  return (
    <Input
      id={id}
      type="time"
      className="w-32"
      value={value}
      onChange={(e) => e.target.value && onChange(e.target.value)}
    />
  )
}

export function SettingsScreen() {
  const { t, weekdayName } = useI18n()
  const s = useDb((db) => db.settings)
  const up = actions.updateSettings

  const weekdays = orderDays([0, 1, 2, 3, 4, 5, 6], s.weekStart)
  const dayOptions = weekdays.map((d) => ({ value: String(d), label: weekdayName(d) }))
  const screens: Screen[] = ['tasks', 'plan', 'today', 'settings']

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('settings.title')}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{t('settings.saved')}</p>
      </div>

      <Section title={t('settings.section.general')}>
        <Field label={t('settings.home')} htmlFor="home">
          <Pick
            id="home"
            value={s.homeScreen}
            options={screens.map((v) => ({ value: v, label: t(`nav.${v}` as MessageKey) }))}
            onChange={(homeScreen) => up({ homeScreen })}
          />
        </Field>
        <Field label={t('settings.defaultEstimate')} htmlFor="est">
          <NumberField id="est" value={s.defaultEstimateMin} min={5} max={480} onChange={(defaultEstimateMin) => up({ defaultEstimateMin })} />
          <span className="text-xs text-muted-foreground">{t('common.min')}</span>
        </Field>
      </Section>

      <Section title={t('settings.section.ivy')}>
        <Field label={t('settings.cap')} htmlFor="cap">
          <Pick
            id="cap"
            value={s.ivyCap}
            options={[
              { value: 'hard', label: t('settings.cap.hard') },
              { value: 'soft', label: t('settings.cap.soft') },
            ]}
            onChange={(ivyCap) => up({ ivyCap })}
          />
        </Field>
        <Field label={t('settings.order')} htmlFor="order">
          <Pick
            id="order"
            value={s.ivyOrder}
            options={[
              { value: 'soft', label: t('settings.order.soft') },
              { value: 'hard', label: t('settings.order.hard') },
            ]}
            onChange={(ivyOrder) => up({ ivyOrder })}
          />
        </Field>
      </Section>

      <Section title={t('settings.section.ritual')}>
        <Field label={t('settings.ritual.mode')} htmlFor="ritual">
          <Pick
            id="ritual"
            value={s.ritual.mode}
            options={[
              { value: 'evening', label: t('settings.ritual.evening') },
              { value: 'morning', label: t('settings.ritual.morning') },
              { value: 'anytime', label: t('settings.ritual.anytime') },
            ]}
            onChange={(mode) => up({ ritual: { mode } })}
          />
        </Field>
        {s.ritual.mode !== 'anytime' && (
          <>
            <Field label={t('settings.ritual.time')} htmlFor="ritual-time">
              <TimeField id="ritual-time" value={s.ritual.time} onChange={(time) => up({ ritual: { time } })} />
            </Field>
            <Field label={t('settings.ritual.reminder')} htmlFor="ritual-reminder">
              <Switch id="ritual-reminder" checked={s.ritual.reminder} onCheckedChange={(reminder) => { up({ ritual: { reminder } }); if (reminder) void ensureNotificationPermission() }} />
            </Field>
          </>
        )}
        <p className="text-xs text-muted-foreground">{t('settings.ritual.note')}</p>
      </Section>

      <Section title={t('settings.section.review')}>
        <Field label={t('settings.review.day')} htmlFor="review-day">
          <Pick
            id="review-day"
            value={String(s.review.weekday)}
            options={dayOptions}
            onChange={(v) => up({ review: { weekday: Number(v) } })}
          />
        </Field>
        <Field label={t('settings.review.time')} htmlFor="review-time">
          <TimeField id="review-time" value={s.review.time} onChange={(time) => up({ review: { time } })} />
        </Field>
        <Field label={t('settings.review.estimate')} htmlFor="review-est">
          <NumberField id="review-est" value={s.review.estimateMin} min={5} max={240} onChange={(estimateMin) => up({ review: { estimateMin } })} />
        </Field>
      </Section>

      <Section title={t('settings.section.week')}>
        <Field label={t('settings.weekStart')} htmlFor="week-start">
          <Pick
            id="week-start"
            value={String(s.weekStart)}
            options={dayOptions}
            onChange={(v) => {
              const weekStart = Number(v)
              up({ weekStart, visibleDays: orderDays(s.visibleDays, weekStart) })
            }}
          />
        </Field>
        <Field label={t('settings.visibleDays')}>
          <ToggleGroup
            type="multiple"
            variant="outline"
            value={s.visibleDays.map(String)}
            onValueChange={(v) => {
              if (v.length) up({ visibleDays: orderDays(v.map(Number), s.weekStart) })
            }}
          >
            {weekdays.map((d) => (
              <ToggleGroupItem key={d} value={String(d)} aria-label={weekdayName(d)}>
                {weekdayName(d, 'short')}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
        <Field label={t('settings.dayStart')} htmlFor="day-start">
          <TimeField id="day-start" value={s.dayStart} onChange={(dayStart) => up({ dayStart })} />
        </Field>
        <Field label={t('settings.overflowAfter')} htmlFor="overflow">
          <TimeField id="overflow" value={s.overflowAfter} onChange={(overflowAfter) => up({ overflowAfter })} />
        </Field>
      </Section>

      <Section title={t('settings.section.gcal')}>
        <GcalSettings s={s} />
      </Section>

      <Section title={t('settings.section.timer')}>
        <h3 className="text-sm font-medium">{t('settings.timer.pomodoro')}</h3>
        <PomodoroFields s={s} />
        <h3 className="text-sm font-medium">{t('settings.timer.presets')}</h3>
        <div className="grid gap-2">
          {s.timer.presets.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-2" data-testid="preset-row">
              <Input
                aria-label={t('settings.timer.presetName')}
                className="w-40"
                value={p.name}
                onChange={(e) => up({ timer: { presets: s.timer.presets.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)) } })}
              />
              <NumberField
                label={t('settings.timer.presetWork')}
                className="w-20"
                value={p.workMin}
                onChange={(workMin) => up({ timer: { presets: s.timer.presets.map((x) => (x.id === p.id ? { ...x, workMin } : x)) } })}
              />
              <span className="text-xs text-muted-foreground">{t('settings.timer.presetWork')}</span>
              <NumberField
                label={t('settings.timer.presetBreak')}
                className="w-20"
                value={p.breakMin}
                onChange={(breakMin) => up({ timer: { presets: s.timer.presets.map((x) => (x.id === p.id ? { ...x, breakMin } : x)) } })}
              />
              <span className="text-xs text-muted-foreground">{t('settings.timer.presetBreak')}</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('common.remove')}
                onClick={() => up({ timer: { presets: s.timer.presets.filter((x) => x.id !== p.id) } })}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                up({ timer: { presets: [...s.timer.presets, { id: newId(), name: `${45} / ${10}`, workMin: 45, breakMin: 10 }] } })
              }
            >
              <Plus /> {t('settings.timer.addPreset')}
            </Button>
          </div>
        </div>
        <Field label={t('settings.timer.sound')} htmlFor="timer-sound">
          <Switch id="timer-sound" checked={s.timer.sound} onCheckedChange={(sound) => up({ timer: { sound } })} />
        </Field>
        <Field label={t('settings.timer.notify')} htmlFor="timer-notify">
          <Switch id="timer-notify" checked={s.timer.notify} onCheckedChange={(notify) => up({ timer: { notify } })} />
        </Field>
      </Section>

      <Section title={t('settings.section.data')}>
        <ExportCsv />
      </Section>

      <Section title={t('settings.section.sync')}>
        <SyncPlaceholder />
      </Section>

      <Section title={t('settings.section.help')}>
        <div>
          <Button variant="outline" onClick={() => ui.open('tour')} data-testid="show-tour">
            {t('settings.tour')}
          </Button>
        </div>
      </Section>

      <Section title={t('settings.section.appearance')}>
        <Field label={t('settings.theme')} htmlFor="theme">
          <Pick
            id="theme"
            value={s.theme}
            options={[
              { value: 'light', label: t('settings.theme.light') },
              { value: 'dark', label: t('settings.theme.dark') },
              { value: 'system', label: t('settings.theme.system') },
            ]}
            onChange={(theme) => up({ theme })}
          />
        </Field>
        <Field label={t('settings.language')} htmlFor="language">
          <Pick
            id="language"
            value={s.language}
            options={[
              { value: 'en', label: t('settings.language.en') },
              { value: 'he', label: t('settings.language.he') },
            ]}
            onChange={(language) => up({ language })}
          />
        </Field>
      </Section>
    </div>
  )
}

function ExportCsv() {
  const { t } = useI18n()
  return (
    <div className="grid gap-2">
      <div>
        <Button
          variant="outline"
          data-testid="export-csv"
          onClick={() => {
            const csv = buildCsv(store.getState())
            downloadText(`2do-export-${todayStr()}.csv`, csv)
            toast.success(t('export.done', { n: Math.max(0, csv.split('\r\n').length - 2) }))
          }}
        >
          <Download /> {t('export.button')}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t('export.hint')}</p>
    </div>
  )
}

function SyncPlaceholder() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={() => setOpen(true)} data-testid="sync-button">
          <RefreshCw /> {t('sync.button')}
        </Button>
        <span className="text-xs text-muted-foreground">{t('sync.hint')}</span>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="sync-soon">
          <DialogHeader>
            <DialogTitle>{t('sync.soon.title')}</DialogTitle>
            <DialogDescription>{t('sync.soon.body')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setOpen(false)}>{t('sync.soon.ok')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function PomodoroFields({ s }: { s: Settings }) {
  const { t } = useI18n()
  const p = s.timer.pomodoro
  const up = (patch: Partial<Settings['timer']['pomodoro']>) => actions.updateSettings({ timer: { pomodoro: patch } })
  return (
    <>
      <Field label={t('settings.timer.work')} htmlFor="pom-work">
        <NumberField id="pom-work" value={p.workMin} max={180} onChange={(workMin) => up({ workMin })} />
      </Field>
      <Field label={t('settings.timer.shortBreak')} htmlFor="pom-short">
        <NumberField id="pom-short" value={p.shortBreakMin} max={60} onChange={(shortBreakMin) => up({ shortBreakMin })} />
      </Field>
      <Field label={t('settings.timer.longBreak')} htmlFor="pom-long">
        <NumberField id="pom-long" value={p.longBreakMin} max={120} onChange={(longBreakMin) => up({ longBreakMin })} />
      </Field>
      <Field label={t('settings.timer.longEvery')} htmlFor="pom-every">
        <NumberField id="pom-every" value={p.longEvery} max={12} onChange={(longEvery) => up({ longEvery })} />
      </Field>
    </>
  )
}

function GcalSettings({ s }: { s: Settings }) {
  const { t } = useI18n()
  const status = useGcalStatus()
  const svc = gcal()
  const connected = status.phase === 'connected'
  const target = status.calendars.find((c) => c.id === s.gcal.targetCalendarId)
  const readable = status.calendars.filter((c) => c.id !== s.gcal.targetCalendarId)

  useEffect(() => {
    if (status.phase === 'connected' && status.calendars.length === 0) void svc.loadCalendars()
    // load once when we become connected
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.phase])

  const phaseText =
    status.phase === 'connected'
      ? t('gcal.connected')
      : status.phase === 'connecting'
        ? t('gcal.connecting')
        : status.phase === 'reconnect'
          ? t('gcal.needsReconnect')
          : t('settings.gcal.notConnected')

  return (
    <>
      {status.phase === 'unconfigured' && (
        <p className="text-sm text-muted-foreground" data-testid="gcal-unconfigured">
          {t('gcal.unconfigured')}
        </p>
      )}
      <Field label={t('settings.gcal.status')}>
        <span className="text-sm text-muted-foreground" data-testid="gcal-status">
          {phaseText}
        </span>
        {(status.phase === 'disconnected' || status.phase === 'unconfigured') && (
          <Button size="sm" disabled={status.phase === 'unconfigured'} onClick={() => void svc.connect()} data-testid="gcal-connect">
            {t('gcal.connect')}
          </Button>
        )}
        {status.phase === 'reconnect' && (
          <Button size="sm" onClick={() => void svc.reconnect()}>
            {t('gcal.reconnect')}
          </Button>
        )}
        {(status.phase === 'connected' || status.phase === 'reconnect') && (
          <Button size="sm" variant="outline" onClick={() => void svc.disconnect()} data-testid="gcal-disconnect">
            {t('gcal.disconnect')}
          </Button>
        )}
      </Field>
      <Field label={t('settings.gcal.syncMode')} htmlFor="gcal-sync">
        <Pick
          id="gcal-sync"
          value={s.gcal.syncMode}
          options={[
            { value: 'auto', label: t('settings.gcal.auto') },
            { value: 'manual', label: t('settings.gcal.manual') },
          ]}
          onChange={(syncMode) => actions.updateSettings({ gcal: { syncMode } })}
        />
      </Field>
      <Field label={t('settings.gcal.target')}>
        <span className="text-sm">{target ? t('gcal.target.name', { name: target.summary }) : t('settings.gcal.targetDefault')}</span>
      </Field>
      <Field label={t('settings.gcal.read')}>
        {!connected ? (
          <span className="text-sm text-muted-foreground">{t('settings.gcal.readNone')}</span>
        ) : readable.length === 0 ? (
          <span className="text-sm text-muted-foreground">{t('gcal.calendars.loading')}</span>
        ) : (
          <div className="grid gap-2" data-testid="gcal-calendars">
            {readable.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={s.gcal.readCalendarIds.includes(c.id)}
                  onCheckedChange={(v) =>
                    actions.updateSettings({
                      gcal: {
                        readCalendarIds: v === true ? [...s.gcal.readCalendarIds, c.id] : s.gcal.readCalendarIds.filter((x) => x !== c.id),
                      },
                    })
                  }
                />
                {c.summary}
              </label>
            ))}
          </div>
        )}
      </Field>
    </>
  )
}
