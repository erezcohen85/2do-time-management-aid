import type { Db } from '@/types'
import { DEFAULT_SETTINGS, emptyDb } from './defaults'

export const STORAGE_KEY = '2do.db.v2'

/** Storage adapter; a Supabase adapter can implement the same shape later. */
export interface Persistence {
  load(): Db
  save(db: Db): void
}

function mergeSettings(stored: Partial<Db['settings']> | undefined): Db['settings'] {
  const d = structuredClone(DEFAULT_SETTINGS)
  const s = stored ?? {}
  return {
    ...d,
    ...s,
    ritual: { ...d.ritual, ...s.ritual },
    review: { ...d.review, ...s.review },
    gcal: { ...d.gcal, ...s.gcal },
    timer: {
      ...d.timer,
      ...s.timer,
      pomodoro: { ...d.timer.pomodoro, ...s.timer?.pomodoro },
    },
  }
}

/** Fill missing keys so data written by older builds keeps working. */
export function normalizeDb(raw: unknown): Db {
  const base = emptyDb()
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Partial<Db>
  return {
    version: 2,
    areas: r.areas ?? base.areas,
    projects: r.projects ?? base.projects,
    items: r.items ?? base.items,
    plans: r.plans ?? base.plans,
    sessions: r.sessions ?? base.sessions,
    reviews: r.reviews ?? base.reviews,
    settings: mergeSettings(r.settings),
    timer: r.timer ?? null,
  }
}

export function localStoragePersistence(storage: Storage = localStorage, key = STORAGE_KEY): Persistence {
  return {
    load() {
      try {
        const text = storage.getItem(key)
        return text ? normalizeDb(JSON.parse(text)) : emptyDb()
      } catch {
        return emptyDb()
      }
    },
    save(db) {
      try {
        storage.setItem(key, JSON.stringify(db))
      } catch {
        // quota or privacy mode: the in-memory state stays authoritative
      }
    },
  }
}
