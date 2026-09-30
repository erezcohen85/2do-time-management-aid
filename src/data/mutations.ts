import type {
  Area, Block, DateStr, DayPlan, Db, Grade, Item, Project, Settings, TimeStr, TimerSession,
  WeeklyReview,
} from '@/types'
import { isPlannable, nextGradeRank, reorderInGrade } from '@/domain/items'
import { leftovers } from '@/domain/plan'
import { canAddBlock } from '@/domain/plan'
import { insertReviewBlock } from '@/domain/review'
import { weekStartOf } from '@/domain/week'

/**
 * Backend-agnostic mutation surface: pure `(db, ...args) => db` reducers.
 * Return the same `db` object when nothing changes. UI calls them through `actions`.
 */

export function makeItem(
  p: Partial<Item> & Pick<Item, 'id' | 'title'>,
  now: string = new Date().toISOString(),
): Item {
  return {
    projectId: null,
    parentId: null,
    grade: null,
    gradeRank: 0,
    checklist: [],
    links: [],
    carryOver: 0,
    done: false,
    createdAt: now,
    ...p,
  }
}

const maxOrder = (xs: { order: number }[]) => (xs.length ? Math.max(...xs.map((x) => x.order)) + 1 : 1)

// ── areas & projects ─────────────────────────────────────────────
export function addArea(db: Db, a: Pick<Area, 'id' | 'name'>): Db {
  return { ...db, areas: [...db.areas, { ...a, order: maxOrder(db.areas) }] }
}

export function renameArea(db: Db, id: string, name: string): Db {
  return { ...db, areas: db.areas.map((a) => (a.id === id ? { ...a, name } : a)) }
}

/** Deleting an area deletes its projects; their items become loose (no project). */
export function deleteArea(db: Db, id: string): Db {
  const gone = new Set(db.projects.filter((p) => p.areaId === id).map((p) => p.id))
  return {
    ...db,
    areas: db.areas.filter((a) => a.id !== id),
    projects: db.projects.filter((p) => p.areaId !== id),
    items: db.items.map((i) => (i.projectId && gone.has(i.projectId) ? { ...i, projectId: null } : i)),
  }
}

export function addProject(db: Db, p: Pick<Project, 'id' | 'areaId' | 'name'> & Partial<Project>): Db {
  const siblings = db.projects.filter((x) => x.areaId === p.areaId)
  return { ...db, projects: [...db.projects, { archived: false, order: maxOrder(siblings), ...p }] }
}

export function updateProject(db: Db, id: string, patch: Partial<Omit<Project, 'id'>>): Db {
  return { ...db, projects: db.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) }
}

export function deleteProject(db: Db, id: string): Db {
  return {
    ...db,
    projects: db.projects.filter((p) => p.id !== id),
    items: db.items.map((i) => (i.projectId === id ? { ...i, projectId: null } : i)),
  }
}

// ── items ────────────────────────────────────────────────────────
export function addItem(db: Db, item: Item): Db {
  return { ...db, items: [...db.items, item] }
}

export type ItemPatch = Partial<Omit<Item, 'id' | 'grade' | 'gradeRank' | 'done' | 'doneAt' | 'createdAt'>>

export function updateItem(db: Db, id: string, patch: ItemPatch): Db {
  return { ...db, items: db.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }
}

/** Move a task (and its subtasks) to a project, or to no project with `null`. */
export function moveItemToProject(db: Db, id: string, projectId: string | null): Db {
  return {
    ...db,
    items: db.items.map((i) => (i.id === id || i.parentId === id ? { ...i, projectId } : i)),
  }
}

/** Deletes the item and its subtasks; clears waiting-on references and plan blocks. */
export function deleteItem(db: Db, id: string): Db {
  const gone = new Set([id, ...db.items.filter((i) => i.parentId === id).map((i) => i.id)])
  const plans: Record<DateStr, DayPlan> = {}
  for (const [d, p] of Object.entries(db.plans)) {
    plans[d] = { ...p, blocks: p.blocks.filter((b) => !(b.itemId && gone.has(b.itemId))) }
  }
  return {
    ...db,
    items: db.items
      .filter((i) => !gone.has(i.id))
      .map((i) => (i.waitingOnId && gone.has(i.waitingOnId) ? { ...i, waitingOnId: undefined } : i)),
    plans,
    sessions: db.sessions.map((s) => (s.itemId && gone.has(s.itemId) ? { ...s, itemId: undefined } : s)),
  }
}

/** Grade an item (appended at the end of the grade), or `null` to send it back to Ungraded. */
export function setGrade(db: Db, id: string, grade: Grade | null): Db {
  const it = db.items.find((i) => i.id === id)
  if (!it || it.grade === grade) return db
  const rank = grade ? nextGradeRank(db.items.filter((i) => i.id !== id), grade) : 0
  return { ...db, items: db.items.map((i) => (i.id === id ? { ...i, grade, gradeRank: rank } : i)) }
}

/** Drag-rank: place at `index` in `grade`'s ordered list. */
export function moveInGrade(db: Db, id: string, grade: Grade, index: number): Db {
  return { ...db, items: reorderInGrade(db.items, id, grade, index) }
}

function syncBlocksDone(plans: Record<DateStr, DayPlan>, itemId: string, done: boolean): Record<DateStr, DayPlan> {
  const out: Record<DateStr, DayPlan> = {}
  for (const [d, p] of Object.entries(plans)) {
    out[d] = p.blocks.some((b) => b.itemId === itemId)
      ? { ...p, blocks: p.blocks.map((b) => (b.itemId === itemId ? { ...b, done } : b)) }
      : p
  }
  return out
}

export function setItemDone(db: Db, id: string, done: boolean, now: string = new Date().toISOString()): Db {
  const it = db.items.find((i) => i.id === id)
  if (!it || it.done === done) return db
  return {
    ...db,
    items: db.items.map((i) => (i.id === id ? { ...i, done, doneAt: done ? now : undefined } : i)),
    plans: syncBlocksDone(db.plans, id, done),
  }
}

// ── plans ────────────────────────────────────────────────────────
const emptyPlan = (date: DateStr): DayPlan => ({ date, blocks: [], locked: false, pushed: false })

function withPlan(db: Db, date: DateStr, fn: (p: DayPlan) => DayPlan, opts: { allowLocked?: boolean } = {}): Db {
  const cur = db.plans[date] ?? emptyPlan(date)
  if (cur.locked && !opts.allowLocked) return db
  const next = fn(cur)
  if (next === cur) return db
  return { ...db, plans: { ...db.plans, [date]: next } }
}

const renumber = (blocks: Block[]): Block[] =>
  [...blocks].sort((a, b) => a.rank - b.rank).map((b, i) => ({ ...b, rank: i + 1 }))

/**
 * Add an item to a day's plan. Refused (db unchanged) when the day is locked, the cap
 * is hit under the hard setting, the item is not plannable, or it is already on the plan.
 * A leftover from the most recent past day gets its carry-over count incremented.
 */
export function addItemBlock(
  db: Db,
  date: DateStr,
  itemId: string,
  o: { id: string; estimateMin?: number; pinnedStart?: TimeStr },
): Db {
  const item = db.items.find((i) => i.id === itemId)
  const plan = db.plans[date]
  if (!item || !isPlannable(item, db.items)) return db
  if (plan?.locked) return db
  if (plan?.blocks.some((b) => b.itemId === itemId)) return db
  if (!canAddBlock(plan, db.settings)) return db
  const wasLeftover = leftovers(db.plans, db.items, date).some((i) => i.id === itemId)
  const estimateMin = o.estimateMin ?? item.estimateMin ?? db.settings.defaultEstimateMin
  const next = withPlan(db, date, (p) => ({
    ...p,
    blocks: [
      ...p.blocks,
      {
        id: o.id, kind: 'item', itemId, estimateMin, done: false, pinnedStart: o.pinnedStart,
        rank: p.blocks.length ? Math.max(...p.blocks.map((b) => b.rank)) + 1 : 1,
      },
    ],
  }))
  return {
    ...next,
    items: next.items.map((i) =>
      i.id === itemId
        ? { ...i, estimateMin: i.estimateMin ?? estimateMin, carryOver: i.carryOver + (wasLeftover ? 1 : 0) }
        : i,
    ),
  }
}

/** Insert the weekly review block once per week on the review day (rank #1). */
export function ensureReviewBlock(db: Db, date: DateStr, id: string): Db {
  const weekStart = weekStartOf(date, db.settings.weekStart)
  if (db.reviews[weekStart]?.blockInserted) return db
  const plan = db.plans[date] ?? emptyPlan(date)
  if (plan.locked) return db
  const next = insertReviewBlock(plan, db.settings, { id })
  if (!next) return db
  const review: WeeklyReview = db.reviews[weekStart] ?? { weekStart, projectNotes: {} }
  return {
    ...db,
    plans: { ...db.plans, [date]: next },
    reviews: { ...db.reviews, [weekStart]: { ...review, blockInserted: true } },
  }
}

export function removeBlock(db: Db, date: DateStr, blockId: string): Db {
  return withPlan(db, date, (p) =>
    p.blocks.some((b) => b.id === blockId) ? { ...p, blocks: renumber(p.blocks.filter((b) => b.id !== blockId)) } : p,
  )
}

/** Reorder: move block to 0-based `index` in rank order. */
export function moveBlock(db: Db, date: DateStr, blockId: string, index: number): Db {
  return withPlan(db, date, (p) => {
    const ordered = [...p.blocks].sort((a, b) => a.rank - b.rank)
    const from = ordered.findIndex((b) => b.id === blockId)
    if (from < 0) return p
    const [b] = ordered.splice(from, 1)
    ordered.splice(Math.max(0, Math.min(index, ordered.length)), 0, b)
    return { ...p, blocks: ordered.map((x, i) => ({ ...x, rank: i + 1 })) }
  })
}

function patchBlock(db: Db, date: DateStr, blockId: string, patch: Partial<Block>): Db {
  return withPlan(db, date, (p) =>
    p.blocks.some((b) => b.id === blockId)
      ? { ...p, blocks: p.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)) }
      : p,
  )
}

export const pinBlock = (db: Db, date: DateStr, blockId: string, time: TimeStr | undefined): Db =>
  patchBlock(db, date, blockId, { pinnedStart: time })

export const setBlockEstimate = (db: Db, date: DateStr, blockId: string, estimateMin: number): Db =>
  patchBlock(db, date, blockId, { estimateMin: Math.max(5, Math.round(estimateMin)) })

export const setBlockGcalId = (db: Db, date: DateStr, blockId: string, gcalEventId: string | undefined): Db =>
  withPlan(db, date, (p) => ({ ...p, blocks: p.blocks.map((b) => (b.id === blockId ? { ...b, gcalEventId } : b)) }), {
    allowLocked: true,
  })

/** Tick a block. Item blocks also tick the underlying item everywhere it is planned. */
export function setBlockDone(db: Db, date: DateStr, blockId: string, done: boolean, now?: string): Db {
  const block = db.plans[date]?.blocks.find((b) => b.id === blockId)
  if (!block || block.done === done) return db
  const base = patchBlock(db, date, blockId, { done })
  if (block.kind === 'item' && block.itemId) return setItemDone(base, block.itemId, done, now)
  if (block.kind === 'review' && done) {
    const weekStart = weekStartOf(date, db.settings.weekStart)
    const r = base.reviews[weekStart] ?? { weekStart, projectNotes: {} }
    return { ...base, reviews: { ...base.reviews, [weekStart]: { ...r, completedAt: now ?? new Date().toISOString() } } }
  }
  return base
}

export const setLocked = (db: Db, date: DateStr, locked: boolean): Db =>
  withPlan(db, date, (p) => (p.locked === locked ? p : { ...p, locked }), { allowLocked: true })

export const setPushed = (db: Db, date: DateStr, pushed: boolean): Db =>
  withPlan(db, date, (p) => (p.pushed === pushed ? p : { ...p, pushed }), { allowLocked: true })

// ── reviews, sessions, settings, timer ───────────────────────────
export function updateReview(db: Db, weekStart: DateStr, patch: Partial<Omit<WeeklyReview, 'weekStart'>>): Db {
  const cur = db.reviews[weekStart] ?? { weekStart, projectNotes: {} }
  return { ...db, reviews: { ...db.reviews, [weekStart]: { ...cur, ...patch } } }
}

export function setProjectNote(db: Db, weekStart: DateStr, projectId: string, note: string): Db {
  const cur = db.reviews[weekStart] ?? { weekStart, projectNotes: {} }
  return updateReview(db, weekStart, { projectNotes: { ...cur.projectNotes, [projectId]: note } })
}

export const addSession = (db: Db, s: TimerSession): Db => ({ ...db, sessions: [...db.sessions, s] })

export const endSession = (db: Db, id: string, end: string): Db => ({
  ...db,
  sessions: db.sessions.map((s) => (s.id === id && !s.end ? { ...s, end } : s)),
})

export const setTimerState = (db: Db, timer: Db['timer']): Db => ({ ...db, timer })

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? (T[K] extends unknown[] ? T[K] : DeepPartial<T[K]>) : T[K] }

export function updateSettings(db: Db, patch: DeepPartial<Settings>): Db {
  const merge = (a: unknown, b: unknown): unknown => {
    if (b === undefined) return a
    if (!b || typeof b !== 'object' || Array.isArray(b) || !a || typeof a !== 'object') return b
    const out: Record<string, unknown> = { ...(a as Record<string, unknown>) }
    for (const [k, v] of Object.entries(b)) out[k] = merge(out[k], v)
    return out
  }
  return { ...db, settings: merge(db.settings, patch) as Settings }
}
