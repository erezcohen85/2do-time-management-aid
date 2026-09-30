import * as m from './mutations'
import { store, type Store } from './store'
import type { Db } from '@/types'

type Bound<M> = {
  [K in keyof M as M[K] extends (db: Db, ...a: never[]) => Db ? K : never]: M[K] extends (
    db: Db,
    ...a: infer A
  ) => Db
    ? (...a: A) => void
    : never
}

/** Bind every pure mutation to a store: `actions.setGrade(id, 'A')`. */
export function bindActions(s: Store): Bound<typeof m> {
  const out: Record<string, unknown> = {}
  for (const [name, fn] of Object.entries(m)) {
    if (typeof fn !== 'function' || name === 'makeItem') continue
    out[name] = (...args: unknown[]) =>
      s.update((db) => (fn as (db: Db, ...a: unknown[]) => Db)(db, ...args))
  }
  return out as Bound<typeof m>
}

export const actions = bindActions(store)
export { newId } from './ids'
export { makeItem } from './mutations'
