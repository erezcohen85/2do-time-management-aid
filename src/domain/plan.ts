import type { Block, DateStr, DayPlan, Grade, Item, Settings } from '@/types'
import { GRADES, IVY_CAP } from '@/types'
import { isBlocked, isLeaf, rankedByGrade } from './items'

const sorted = (plan: DayPlan) => [...plan.blocks].sort((a, b) => a.rank - b.rank)

export function capStatus(plan: DayPlan | undefined, settings: Settings) {
  void settings
  const count = plan?.blocks.length ?? 0
  return { count, cap: IVY_CAP, full: count >= IVY_CAP, over: count > IVY_CAP }
}

/** Hard cap refuses the 7th block; soft cap allows it (UI warns). */
export function canAddBlock(plan: DayPlan | undefined, settings: Settings): boolean {
  if (settings.ivyCap === 'soft') return true
  return (plan?.blocks.length ?? 0) < IVY_CAP
}

export function topUnfinished(plan: DayPlan | undefined): Block | null {
  if (!plan) return null
  return sorted(plan).find((b) => !b.done) ?? null
}

/** A block ticked while a higher-ranked block is still open. */
export function isOutOfOrder(plan: DayPlan | undefined, blockId: string): boolean {
  const top = topUnfinished(plan)
  const block = plan?.blocks.find((b) => b.id === blockId)
  return !!top && !!block && !block.done && top.id !== block.id
}

export function canTick(plan: DayPlan | undefined, blockId: string, settings: Settings): boolean {
  const block = plan?.blocks.find((b) => b.id === blockId)
  if (!block) return false
  if (block.done) return true
  if (settings.ivyOrder === 'soft') return true
  return topUnfinished(plan)?.id === blockId
}

export function score(plan: DayPlan | undefined): { done: number; total: number } {
  const blocks = plan?.blocks ?? []
  return { done: blocks.filter((b) => b.done).length, total: blocks.length }
}

/**
 * Unfinished item blocks from the most recent past day that has blocks,
 * in their old order. Only items that are still open and leaves.
 */
export function leftovers(plans: Record<DateStr, DayPlan>, items: Item[], date: DateStr): Item[] {
  const past = Object.keys(plans)
    .filter((d) => d < date && plans[d].blocks.length > 0)
    .sort()
  const last = past[past.length - 1]
  if (!last) return []
  const out: Item[] = []
  for (const b of sorted(plans[last])) {
    if (b.kind !== 'item' || b.done) continue
    const it = items.find((i) => i.id === b.itemId)
    if (it && !it.done && isLeaf(it, items)) out.push(it)
  }
  return out
}

export interface Candidate {
  item: Item
  blocked: boolean
}

export interface Candidates {
  leftovers: Candidate[]
  due: Candidate[]
  byGrade: Record<Grade, Candidate[]>
}

/**
 * Candidate pool for planning `date`: leftovers first, then due/overdue, then grades A to E.
 * Leaf, open items only; items already on that day's plan are excluded; blocked items are flagged.
 */
export function candidates(
  items: Item[],
  plans: Record<DateStr, DayPlan>,
  date: DateStr,
  filter = '',
): Candidates {
  const onPlan = new Set((plans[date]?.blocks ?? []).map((b) => b.itemId).filter(Boolean))
  const q = filter.trim().toLowerCase()
  const ok = (i: Item) =>
    !i.done && isLeaf(i, items) && !onPlan.has(i.id) && (!q || i.title.toLowerCase().includes(q))
  const wrap = (i: Item): Candidate => ({ item: i, blocked: isBlocked(i, items) })
  const used = new Set<string>()
  const take = (list: Item[]) =>
    list.filter(ok).filter((i) => !used.has(i.id)).map((i) => { used.add(i.id); return wrap(i) })

  const left = take(leftovers(plans, items, date))
  const dueItems = items
    .filter((i) => i.due && i.due <= date)
    .sort((a, b) => a.due!.localeCompare(b.due!) || a.gradeRank - b.gradeRank)
  const due = take(dueItems)
  const byGrade = Object.fromEntries(
    GRADES.map((g) => [g, take(rankedByGrade(items, g))]),
  ) as Record<Grade, Candidate[]>
  return { leftovers: left, due, byGrade }
}
