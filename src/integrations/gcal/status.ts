import { useSyncExternalStore } from 'react'
import type { CalendarInfo } from './types'

export type GcalPhase = 'unconfigured' | 'disconnected' | 'connecting' | 'connected' | 'reconnect'

export interface GcalStatus {
  phase: GcalPhase
  syncing: boolean
  /** Non-blocking problem to show in the banner. `reconnect` needs the user to sign in again. */
  error: { message: string; action: 'retry' | 'reconnect' } | null
  calendars: CalendarInfo[]
  lastSyncAt?: number
}

const INITIAL: GcalStatus = { phase: 'disconnected', syncing: false, error: null, calendars: [] }

export function createStatusStore() {
  let state: GcalStatus = INITIAL
  const listeners = new Set<() => void>()
  return {
    get: () => state,
    set(patch: Partial<GcalStatus>) {
      state = { ...state, ...patch }
      listeners.forEach((l) => l())
    },
    reset() {
      state = INITIAL
      listeners.forEach((l) => l())
    },
    subscribe(l: () => void) {
      listeners.add(l)
      return () => listeners.delete(l)
    },
  }
}

export type StatusStore = ReturnType<typeof createStatusStore>

export const gcalStatus: StatusStore = createStatusStore()

export function useGcalStatus(): GcalStatus {
  return useSyncExternalStore(gcalStatus.subscribe, gcalStatus.get)
}
