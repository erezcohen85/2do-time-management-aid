import { useState } from 'react'
import { Pause, Play, SkipForward, Square, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDb } from '@/data/hooks'
import { useI18n } from '@/i18n'
import { pickLine, type PoolKey } from '@/i18n/microcopy'
import { ensureNotificationPermission } from '@/timer/alerts'
import { elapsedMs, isFocusPhase, type TimerState } from '@/timer/engine'
import { displayMs, formatClock } from '@/timer/format'
import { timerController, useNow, useTimerState } from '@/timer/hooks'
import { timerPrefs, useTimerPrefs } from '@/timer/prefs'
import type { TimerMode } from '@/types'

const NONE = '__none'

function poolFor(s: TimerState, now: number): { pool: PoolKey; rotation: number } {
  if (s.status === 'finished') return { pool: 'end', rotation: 0 }
  if (s.phase === 'shortBreak' || s.phase === 'longBreak') return { pool: 'break', rotation: 0 }
  if (s.phase === 'stopwatch') return { pool: 'stopwatch', rotation: Math.floor(elapsedMs(s, now) / 60000) }
  const minutes = Math.floor(elapsedMs(s, now) / 60000)
  if (minutes < 1 && s.status === 'running') return { pool: 'start', rotation: 0 }
  return { pool: 'running', rotation: minutes }
}

export function TimerPanel() {
  const { t, lang } = useI18n()
  const state = useTimerState()
  const prefs = useTimerPrefs()
  const now = useNow(250)
  const items = useDb((db) => db.items)
  const presets = useDb((db) => db.settings.timer.presets)
  const notify = useDb((db) => db.settings.timer.notify)
  const prefsPomodoroWork = useDb((db) => db.settings.timer.pomodoro.workMin)
  const [minutes, setMinutes] = useState(String(prefs.countdownMin))
  const [pendingTag, setPendingTag] = useState<string | undefined>()
  const ctl = timerController()
  const active = state !== null
  const mode: TimerMode = state?.mode ?? prefs.mode
  const presetId = prefs.presetId ?? presets[0]?.id
  const openItems = items.filter((i) => !i.done)

  function start() {
    if (notify) void ensureNotificationPermission()
    const countdownMin = Math.max(1, Math.round(Number(minutes)) || prefs.countdownMin)
    if (mode === 'countdown') timerPrefs.set({ countdownMin })
    ctl.start({ mode, itemId: pendingTag, presetId, countdownMin })
  }

  const phaseLabel = state ? t(`timer.phase.${state.phase}`) : t('timer.ready')
  const line = state ? (() => { const p = poolFor(state, now); return pickLine(lang, p.pool, state.seed, p.rotation) })() : pickLine(lang, 'start', 3)
  const idleMin =
    mode === 'countdown' ? Number(minutes) || 0 : mode === 'pomodoro' ? prefsPomodoroWork : mode === 'preset' ? (presets.find((p) => p.id === presetId)?.workMin ?? 0) : 0
  const big = state ? displayMs(state, now) : idleMin * 60000
  const cyclesTotal = state?.config.pomodoro.longEvery ?? 4
  const dotsFilled = !state
    ? 0
    : state.phase === 'work'
      ? state.cycle % cyclesTotal
      : state.cycle % cyclesTotal === 0
        ? cyclesTotal
        : state.cycle % cyclesTotal

  return (
    <Card data-testid="timer-panel">
      <CardContent className="grid gap-4">
        <Tabs value={mode} onValueChange={(v) => !active && timerPrefs.set({ mode: v as TimerMode })}>
          <TabsList className="w-full">
            {(['pomodoro', 'countdown', 'stopwatch', 'preset'] as const).map((m) => (
              <TabsTrigger key={m} value={m} aria-controls={undefined} disabled={active && m !== mode} data-testid={`timer-mode-${m}`}>
                {t(`timer.mode.${m}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {!active && mode === 'countdown' && (
          <div className="flex items-center gap-2">
            <Label htmlFor="cd-min">{t('timer.minutes')}</Label>
            <Input id="cd-min" type="number" min={1} max={600} className="w-24" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </div>
        )}
        {!active && mode === 'preset' && (
          <div className="grid gap-1.5">
            {presets.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t('timer.preset.none')}</p>
            ) : (
              <>
                <Label htmlFor="preset-pick">{t('timer.preset')}</Label>
                <Select value={presetId} onValueChange={(v) => timerPrefs.set({ presetId: v })}>
                  <SelectTrigger id="preset-pick" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {presets.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {t('timer.preset.option', { name: p.name, work: p.workMin, brk: p.breakMin })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        )}

        <div className="grid justify-items-center gap-1 text-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span data-testid="timer-phase">{state && state.status === 'finished' ? t('timer.finished') : phaseLabel}</span>
            {state?.mode === 'pomodoro' && <Badge variant="secondary">{t('timer.round', { n: state.phase === 'work' ? state.cycle + 1 : state.cycle })}</Badge>}
            {state?.status === 'paused' && <Badge variant="outline">{t('timer.pause')}</Badge>}
          </div>
          <div className="font-mono text-6xl tabular-nums" data-testid="timer-digits" aria-live="off">
            {formatClock(big)}
          </div>
          {state?.mode === 'pomodoro' && (
            <div className="flex gap-1.5" aria-hidden>
              {Array.from({ length: cyclesTotal }, (_, i) => (
                <span key={i} className={`size-2.5 rounded-full border ${i < dotsFilled ? 'bg-primary' : ''}`} />
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="working-on">{t('timer.workingOn')}</Label>
          <Select
            value={(state ? state.itemId : pendingTag) ?? NONE}
            onValueChange={(v) => {
              const id = v === NONE ? undefined : v
              if (state) ctl.setTag(id)
              else setPendingTag(id)
            }}
          >
            <SelectTrigger id="working-on" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{t('timer.untagged')}</SelectItem>
              {openItems.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {!active && (
            <Button onClick={start} data-testid="timer-start">
              <Play /> {t('timer.start')}
            </Button>
          )}
          {state?.status === 'running' && (
            <Button variant="outline" onClick={() => ctl.pause()} data-testid="timer-pause">
              <Pause /> {t('timer.pause')}
            </Button>
          )}
          {state?.status === 'paused' && (
            <Button onClick={() => ctl.resume()} data-testid="timer-resume">
              <Play /> {t('timer.resume')}
            </Button>
          )}
          {state && !isFocusPhase(state.phase) && state.status !== 'finished' && (
            <Button variant="outline" onClick={() => ctl.skip()} data-testid="timer-skip">
              <SkipForward /> {t('timer.skip')}
            </Button>
          )}
          {state && state.status !== 'finished' && (
            <Button variant="outline" onClick={() => ctl.stop()} data-testid="timer-stop">
              <Square /> {t('timer.stop')}
            </Button>
          )}
          {state?.status === 'finished' && (
            <Button variant="outline" onClick={() => ctl.stop()} data-testid="timer-clear">
              <X /> {t('timer.reset')}
            </Button>
          )}
        </div>

        <p className="min-h-5 text-center text-sm italic text-muted-foreground" data-testid="timer-line">
          “{line}”
        </p>
      </CardContent>
    </Card>
  )
}
