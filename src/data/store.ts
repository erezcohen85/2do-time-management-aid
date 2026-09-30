import type { Db } from '@/types'
import { localStoragePersistence, type Persistence } from './persistence'

export interface Store {
  getState(): Db
  subscribe(listener: () => void): () => void
  /** Apply a pure mutation and persist. No-op (no notify) when the result is the same object. */
  update(fn: (db: Db) => Db): void
  /** Re-read from persistence (used by tests and cross-tab sync). */
  reload(): void
}

export function createStore(persistence: Persistence): Store {
  let state = persistence.load()
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((l) => l())
  return {
    getState: () => state,
    subscribe(l) {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    update(fn) {
      const next = fn(state)
      if (next === state) return
      state = next
      persistence.save(state)
      emit()
    },
    reload() {
      state = persistence.load()
      emit()
    },
  }
}

export const store: Store = createStore(localStoragePersistence())
