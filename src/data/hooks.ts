import { useSyncExternalStore } from 'react'
import type { Db } from '@/types'
import { store } from './store'

/**
 * Subscribe to a slice of the db. The selector must return a referentially stable
 * value (a field of `db`, not a freshly built object), otherwise React re-renders forever.
 */
export function useDb<T>(selector: (db: Db) => T): T {
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()))
}
