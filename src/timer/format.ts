import { elapsedMs, remainingMs, type TimerState } from './engine'

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/** Display milliseconds: remaining for timed phases, elapsed for the stopwatch. */
export function displayMs(s: TimerState, now: number): number {
  return remainingMs(s, now) ?? elapsedMs(s, now)
}
