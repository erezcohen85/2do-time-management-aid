import type { Grade, Item, Smart, DateStr } from '@/types'
import { GRADES } from '@/types'

export function childrenOf(id: string, items: Item[]): Item[] {
  return items.filter((i) => i.parentId === id)
}

/** Plannable units: subtasks, or tasks that have no subtasks. */
export function isLeaf(item: Item, items: Item[]): boolean {
  return item.parentId !== null || !items.some((i) => i.parentId === item.id)
}

export function isBlocked(item: Item, items: Item[]): boolean {
  if (!item.waitingOnId) return false
  const blocker = items.find((i) => i.id === item.waitingOnId)
  return !!blocker && !blocker.done
}

export function isPlannable(item: Item, items: Item[]): boolean {
  return !item.done && isLeaf(item, items) && !isBlocked(item, items)
}

const byRank = (a: Item, b: Item) =>
  a.gradeRank - b.gradeRank || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)

/** Open items of a grade in rank order. */
export function rankedByGrade(items: Item[], grade: Grade): Item[] {
  return items.filter((i) => i.grade === grade && !i.done).sort(byRank)
}

export function ungraded(items: Item[]): Item[] {
  return items
    .filter((i) => i.grade === null && !i.done)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
}

export function rankLabel(item: Item, items: Item[]): string | null {
  if (!item.grade || item.done) return null
  const idx = rankedByGrade(items, item.grade).findIndex((i) => i.id === item.id)
  return idx < 0 ? null : `${item.grade}${idx + 1}`
}

export function nextGradeRank(items: Item[], grade: Grade): number {
  const ranked = rankedByGrade(items, grade)
  return ranked.length ? Math.max(...ranked.map((i) => i.gradeRank)) + 1 : 1
}

/**
 * Place `id` at `index` within `grade` (changing its grade if needed) and renumber
 * the affected grades 1..n. Returns a new items array.
 */
export function reorderInGrade(items: Item[], id: string, grade: Grade, index: number): Item[] {
  const moving = items.find((i) => i.id === id)
  if (!moving) return items
  const from = moving.grade
  const target = rankedByGrade(items, grade).filter((i) => i.id !== id)
  const at = Math.max(0, Math.min(index, target.length))
  target.splice(at, 0, { ...moving, grade })
  const ranks = new Map<string, { grade: Grade; rank: number }>()
  target.forEach((it, k) => ranks.set(it.id, { grade, rank: k + 1 }))
  if (from && from !== grade) {
    rankedByGrade(items, from)
      .filter((i) => i.id !== id)
      .forEach((it, k) => ranks.set(it.id, { grade: from, rank: k + 1 }))
  }
  return items.map((it) => {
    const r = ranks.get(it.id)
    return r ? { ...it, grade: r.grade, gradeRank: r.rank } : it
  })
}

export function gradeIndex(g: Grade | null): number {
  return g ? GRADES.indexOf(g) : GRADES.length
}

/** Number of filled SMART fields out of 5 (T is the item's due date). */
export function smartCount(smart: Smart | undefined, due: DateStr | undefined): number {
  const filled = (s?: string) => !!s && s.trim().length > 0
  let n = 0
  if (smart) {
    if (filled(smart.specific)) n++
    if (filled(smart.metric) || smart.target !== undefined) n++
    if (filled(smart.achievable)) n++
    if (filled(smart.relevant)) n++
  }
  if (due) n++
  return n
}

/** Measurable progress 0..1, or null when no numeric target is set. */
export function smartProgress(smart: Smart | undefined): number | null {
  if (!smart || smart.target === undefined || smart.target <= 0) return null
  return Math.max(0, Math.min(1, (smart.current ?? 0) / smart.target))
}
