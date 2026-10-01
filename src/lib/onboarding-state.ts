import { useSyncExternalStore } from 'react'

const KEY = '2do.onboarded'
const listeners = new Set<() => void>()

const read = () => {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return true // storage blocked: never nag
  }
}

/** Per-browser flag: has the first-run tour been seen or skipped? */
export const onboarding = {
  done: read,
  markDone() {
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      // ignore
    }
    listeners.forEach((l) => l())
  },
}

export function useOnboarded(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    read,
  )
}
