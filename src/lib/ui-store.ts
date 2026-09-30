import { useSyncExternalStore } from 'react'

type Key = 'quickAdd' | 'search'
const state: Record<Key, boolean> = { quickAdd: false, search: false }
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** Tiny store for global dialogs (quick add, search) so any screen can open them. */
export const ui = {
  set(key: Key, open: boolean) {
    if (state[key] === open) return
    state[key] = open
    emit()
  },
  open: (key: Key) => ui.set(key, true),
  close: (key: Key) => ui.set(key, false),
}

export function useUi(key: Key): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state[key],
  )
}
