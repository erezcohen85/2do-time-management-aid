import { useSyncExternalStore } from 'react'

const HANDLED = '2do.ritual.handled'
const NOTIFIED = '2do.ritual.notified'
const listeners = new Set<() => void>()

const read = (k: string): string | undefined => {
  try {
    return localStorage.getItem(k) ?? undefined
  } catch {
    return undefined
  }
}
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v)
  } catch {
    // storage unavailable: banner may reappear after reload
  }
  listeners.forEach((l) => l())
}

/** Per-browser memory of which days the planning reminder was handled or announced. */
export const ritualState = {
  handled: () => read(HANDLED),
  markHandled: (today: string) => write(HANDLED, today),
  notified: () => read(NOTIFIED),
  markNotified: (today: string) => write(NOTIFIED, today),
}

export function useRitualHandled(): string | undefined {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    ritualState.handled,
  )
}
