import { newId } from '@/data/ids'
import { addSession, endSession, setTimerState } from '@/data/mutations'
import { store as appStore, type Store } from '@/data/store'
import type { Settings, TimerMode } from '@/types'
import {
  advance, isFocusPhase, pause as pausePure, resume as resumePure, skip as skipPure, startTimer,
  type EndedPhase, type TimerConfig, type TimerState,
} from './engine'

export interface Alerter {
  phaseEnded(ended: EndedPhase, next: TimerState, settings: Settings): void
}

export interface ControllerDeps {
  store: Store
  now: () => number
  random: () => number
  id: () => string
  alerter: Alerter
}

export function buildConfig(settings: Settings, presetId?: string, countdownMin?: number): TimerConfig {
  const preset = settings.timer.presets.find((p) => p.id === presetId) ?? settings.timer.presets[0]
  return {
    pomodoro: { ...settings.timer.pomodoro },
    preset: preset ? { workMin: preset.workMin, breakMin: preset.breakMin } : undefined,
    countdownMin,
  }
}

const iso = (ms: number) => new Date(ms).toISOString()

export function createTimerController(deps: ControllerDeps) {
  const { store, now, random, id, alerter } = deps
  const seed = () => Math.floor(random() * 1000)
  const current = () => store.getState().timer

  /** Open a session for a running focus phase; returns the state with its id. */
  function openSession(s: TimerState, at: number): TimerState {
    if (!isFocusPhase(s.phase) || s.status !== 'running') return { ...s, sessionId: undefined }
    const sessionId = id()
    store.update((db) => addSession(db, { id: sessionId, mode: s.mode, start: iso(at), itemId: s.itemId }))
    return { ...s, sessionId }
  }

  function closeSession(s: TimerState, at: number) {
    if (s.sessionId) store.update((db) => endSession(db, s.sessionId!, iso(at)))
  }

  const put = (s: TimerState | null) => store.update((db) => setTimerState(db, s))

  return {
    /** Start a fresh timer, replacing any existing one. */
    start(o: { mode: TimerMode; itemId?: string; presetId?: string; countdownMin?: number }) {
      const prev = current()
      const t = now()
      if (prev) closeSession(prev, t)
      const cfg = buildConfig(store.getState().settings, o.presetId, o.countdownMin)
      put(openSession(startTimer({ mode: o.mode, config: cfg, now: t, seed: seed(), itemId: o.itemId, countdownMin: o.countdownMin }), t))
    },
    pause() {
      const s = current()
      if (!s || s.status !== 'running') return
      const t = now()
      closeSession(s, t)
      put({ ...pausePure(s, t), sessionId: undefined })
    },
    resume() {
      const s = current()
      if (!s || s.status !== 'paused') return
      const t = now()
      put(openSession(resumePure(s, t), t))
    },
    /** Stop and clear the timer. */
    stop() {
      const s = current()
      if (!s) return
      closeSession(s, now())
      put(null)
    },
    /** Skip a break: next work phase, ready to start. */
    skip() {
      const s = current()
      if (!s) return
      const t = now()
      closeSession(s, t)
      put(skipPure(s, t, seed()))
    },
    /** Change what is being worked on. Splits the running session so each tag gets its own time. */
    setTag(itemId: string | undefined) {
      const s = current()
      if (!s || s.itemId === itemId) return
      const t = now()
      closeSession(s, t)
      put(openSession({ ...s, itemId }, t))
    },
    /** Call regularly: ends the phase if its time ran out, logs the session, and alerts. */
    tick() {
      const s = current()
      if (!s) return
      const r = advance(s, now(), seed())
      if (!r.ended || !r.state) return
      closeSession(s, r.ended.endedAt)
      put(r.state)
      alerter.phaseEnded(r.ended, r.state, store.getState().settings)
    },
  }
}

export type TimerController = ReturnType<typeof createTimerController>

let singleton: TimerController | null = null

/** App-wide controller, wired to the real store, clock and browser alerts. */
export function getTimerController(alerter: Alerter): TimerController {
  singleton ??= createTimerController({ store: appStore, now: () => Date.now(), random: () => Math.random(), id: newId, alerter })
  return singleton
}
