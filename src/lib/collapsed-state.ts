import { useSyncExternalStore } from 'react'

const KEY = '2do.tm.collapsed'
const listeners = new Set<() => void>()
let cache: Set<string> | null = null

function read(): Set<string> {
  if (cache) return cache
  try {
    cache = new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[])
  } catch {
    cache = new Set()
  }
  return cache
}

function write(next: Set<string>) {
  cache = next
  try {
    localStorage.setItem(KEY, JSON.stringify([...next]))
  } catch {
    // storage unavailable: collapse state lasts for this page load only
  }
  listeners.forEach((l) => l())
}

export const collapsedState = {
  has: (id: string) => read().has(id),
  set(id: string, collapsed: boolean) {
    const next = new Set(read())
    if (collapsed) next.add(id)
    else next.delete(id)
    write(next)
  },
  /** For tests: forget everything remembered. */
  reset() {
    cache = null
    listeners.forEach((l) => l())
  },
}

/** Per-browser memory of which areas/projects are collapsed in the Task Manager. */
export function useCollapsed(id: string): [boolean, (collapsed: boolean) => void] {
  const snapshot = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => read(),
  )
  return [snapshot.has(id), (c) => collapsedState.set(id, c)]
}
