import { useSyncExternalStore } from 'react'
import { store } from './store'
import type { DBShape, ID, LinkParentType } from '@/types'

// Subscribe to the whole DB. Components re-render on any mutation; the data set
// for a single user is small, so this is plenty fast and keeps things simple.
export function useDB(): DBShape {
  return useSyncExternalStore(store.subscribe, store.getSnapshot)
}

export { store }

// ───────────────────────── derived selectors ─────────────────────────
const bySort = <T extends { sortOrder: number }>(a: T, b: T) => a.sortOrder - b.sortOrder

export function useAreas() {
  const db = useDB()
  return [...db.areas].sort(bySort)
}

export function useProjects(areaId?: ID) {
  const db = useDB()
  return db.projects.filter((p) => !areaId || p.areaId === areaId).sort(bySort)
}

export function useProject(projectId?: ID) {
  const db = useDB()
  return db.projects.find((p) => p.id === projectId)
}

export function useTasks(projectId?: ID) {
  const db = useDB()
  return db.tasks.filter((t) => !projectId || t.projectId === projectId).sort(bySort)
}

export function useSubtasks(taskId: ID) {
  const db = useDB()
  return db.subtasks.filter((s) => s.taskId === taskId).sort(bySort)
}

export function useChecklist(subtaskId: ID) {
  const db = useDB()
  return db.checklistItems.filter((c) => c.subtaskId === subtaskId).sort(bySort)
}

export function useLinks(parentType: LinkParentType, parentId: ID) {
  const db = useDB()
  return db.links
    .filter((l) => l.parentType === parentType && l.parentId === parentId)
    .sort(bySort)
}

// counts for sidebar / project rows: open (incomplete) tasks
export function useOpenTaskCount(projectId: ID) {
  const db = useDB()
  return db.tasks.filter((t) => t.projectId === projectId && !t.completed).length
}
