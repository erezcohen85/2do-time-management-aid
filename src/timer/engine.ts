import type { TimerMode } from '@/types'

export type Phase = 'work' | 'shortBreak' | 'longBreak' | 'countdown' | 'stopwatch'
export type TimerStatus = 'running' | 'paused' | 'finished'

export interface TimerConfig {
  pomodoro: { workMin: number; shortBreakMin: number; longBreakMin: number; longEvery: number }
  preset?: { workMin: number; breakMin: number }
  countdownMin?: number
}

/** Persisted in `db.timer`. The display is derived from timestamps, so it survives reloads. */
export interface TimerState {
  mode: TimerMode
  phase: Phase
  status: TimerStatus
  /** Epoch ms when the current run segment began (meaningful while running). */
  segmentStart: number
  /** Milliseconds accumulated before the current run segment. */
  elapsedMs: number
  durationMs: number | null
  itemId?: string
  /** Completed pomodoro work phases in this set. */
  cycle: number
  /** Config snapshot taken at start, so settings edits do not change a running timer. */
  config: TimerConfig
  /** Random number picked at each transition; selects microcopy lines. */
  seed: number
  /** Id of the open `TimerSession` while a focus phase runs. */
  sessionId?: string
}

const MIN = 60_000

export const isFocusPhase = (p: Phase) => p === 'work' || p === 'countdown' || p === 'stopwatch'

export function startTimer(o: {
  mode: TimerMode
  config: TimerConfig
  now: number
  seed: number
  itemId?: string
  countdownMin?: number
}): TimerState {
  const { mode, config, now, seed, itemId } = o
  const base = { mode, status: 'running' as const, segmentStart: now, elapsedMs: 0, itemId, cycle: 0, config, seed }
  switch (mode) {
    case 'pomodoro':
      return { ...base, phase: 'work', durationMs: config.pomodoro.workMin * MIN }
    case 'countdown':
      return { ...base, phase: 'countdown', durationMs: (o.countdownMin ?? config.countdownMin ?? 25) * MIN }
    case 'stopwatch':
      return { ...base, phase: 'stopwatch', durationMs: null }
    case 'preset':
      return { ...base, phase: 'work', durationMs: (config.preset?.workMin ?? config.pomodoro.workMin) * MIN }
  }
}

export function elapsedMs(s: TimerState, now: number): number {
  return s.elapsedMs + (s.status === 'running' ? Math.max(0, now - s.segmentStart) : 0)
}

export function remainingMs(s: TimerState, now: number): number | null {
  return s.durationMs === null ? null : Math.max(0, s.durationMs - elapsedMs(s, now))
}

export function pause(s: TimerState, now: number): TimerState {
  if (s.status !== 'running') return s
  return { ...s, status: 'paused', elapsedMs: elapsedMs(s, now) }
}

export function resume(s: TimerState, now: number): TimerState {
  if (s.status !== 'paused') return s
  return { ...s, status: 'running', segmentStart: now }
}

export function isOver(s: TimerState, now: number): boolean {
  return s.status === 'running' && s.durationMs !== null && elapsedMs(s, now) >= s.durationMs
}

export interface EndedPhase {
  phase: Phase
  mode: TimerMode
  itemId?: string
  /** True end time (epoch ms), even if we noticed late. */
  endedAt: number
  sessionId?: string
}

/** Ready-to-start (paused) state for the phase that follows `s`, or null when the timer is done. */
function nextState(s: TimerState, seed: number): TimerState | null {
  const common = { status: 'paused' as const, elapsedMs: 0, segmentStart: 0, seed, sessionId: undefined }
  const pom = s.config.pomodoro
  if (s.mode === 'pomodoro') {
    if (s.phase === 'work') {
      const cycle = s.cycle + 1
      const long = cycle % pom.longEvery === 0
      return {
        ...s, ...common, cycle,
        phase: long ? 'longBreak' : 'shortBreak',
        durationMs: (long ? pom.longBreakMin : pom.shortBreakMin) * MIN,
      }
    }
    return { ...s, ...common, phase: 'work', durationMs: pom.workMin * MIN }
  }
  if (s.mode === 'preset') {
    const p = s.config.preset ?? { workMin: pom.workMin, breakMin: pom.shortBreakMin }
    if (s.phase === 'work') return { ...s, ...common, phase: 'shortBreak', durationMs: p.breakMin * MIN }
    return { ...s, ...common, phase: 'work', durationMs: p.workMin * MIN }
  }
  return null
}

/**
 * If the running phase has run out, report it and move to the next phase (ready, paused),
 * or to `finished` for a countdown.
 */
export function advance(s: TimerState, now: number, seed: number): { state: TimerState | null; ended: EndedPhase | null } {
  if (!isOver(s, now)) return { state: s, ended: null }
  const endedAt = s.segmentStart + (s.durationMs! - s.elapsedMs)
  const ended: EndedPhase = { phase: s.phase, mode: s.mode, itemId: s.itemId, endedAt, sessionId: s.sessionId }
  const next = nextState(s, seed)
  return {
    ended,
    state: next ?? { ...s, status: 'finished', elapsedMs: s.durationMs!, sessionId: undefined, seed },
  }
}

/** Skip a break and get the next work phase, ready to start. No-op in focus phases. */
export function skip(s: TimerState, _now: number, seed: number): TimerState {
  if (isFocusPhase(s.phase)) return s
  return nextState(s, seed) ?? s
}
