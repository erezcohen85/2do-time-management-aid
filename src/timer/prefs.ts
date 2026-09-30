import { useSyncExternalStore } from 'react'
import type { TimerMode } from '@/types'

export interface TimerPrefs {
  mode: TimerMode
  countdownMin: number
  presetId?: string
}

const KEY = '2do.timer.prefs'
const DEFAULT: TimerPrefs = { mode: 'pomodoro', countdownMin: 25 }
const listeners = new Set<() => void>()
let cache: TimerPrefs | null = null

function read(): TimerPrefs {
  if (cache) return cache
  try {
    cache = { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    cache = DEFAULT
  }
  return cache!
}

/** Per-browser timer picks (last mode, countdown length, preset). Not part of the synced data. */
export const timerPrefs = {
  get: read,
  set(patch: Partial<TimerPrefs>) {
    cache = { ...read(), ...patch }
    try {
      localStorage.setItem(KEY, JSON.stringify(cache))
    } catch {
      // storage unavailable: keep the in-memory value
    }
    listeners.forEach((l) => l())
  },
  reset() {
    cache = null
    listeners.forEach((l) => l())
  },
}

export function useTimerPrefs(): TimerPrefs {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    read,
  )
}
