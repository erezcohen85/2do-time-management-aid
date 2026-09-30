import type { Block, DayPlan, Item, Settings } from '@/types'
import { DEFAULT_SETTINGS } from '@/data/defaults'
import {
  canAddBlock, candidates, canTick, capStatus, isOutOfOrder, leftovers, score, topUnfinished,
} from './plan'

let n = 0
const item = (p: Partial<Item> = {}): Item => ({
  id: `i${++n}`, projectId: null, parentId: null, title: 't', grade: null, gradeRank: 0,
  checklist: [], links: [], carryOver: 0, done: false, createdAt: '2026-01-01T00:00:00Z', ...p,
})
const blk = (id: string, rank: number, done = false, itemId = id): Block => ({
  id, kind: 'item', itemId, rank, estimateMin: 30, done,
})
const plan = (date: string, blocks: Block[]): DayPlan => ({ date, blocks, locked: false, pushed: false })
const S = (p: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, ...p })

describe('cap', () => {
  const six = plan('2026-10-02', Array.from({ length: 6 }, (_, i) => blk(`b${i}`, i + 1)))
  it('hard cap blocks the 7th', () => {
    expect(canAddBlock(six, S())).toBe(false)
    expect(canAddBlock(plan('d', [blk('a', 1)]), S())).toBe(true)
  })
  it('soft cap allows but warns', () => {
    expect(canAddBlock(six, S({ ivyCap: 'soft' }))).toBe(true)
    expect(capStatus(six, S({ ivyCap: 'soft' }))).toEqual({ count: 6, cap: 6, full: true, over: false })
    const seven = plan('d', [...six.blocks, blk('x', 7)])
    expect(capStatus(seven, S({ ivyCap: 'soft' })).over).toBe(true)
  })
  it('undefined plan counts as empty', () => {
    expect(canAddBlock(undefined, S())).toBe(true)
    expect(capStatus(undefined, S()).count).toBe(0)
  })
})

describe('order', () => {
  const p = plan('d', [blk('a', 1, true), blk('b', 2), blk('c', 3)])
  it('finds the top unfinished block', () => {
    expect(topUnfinished(p)!.id).toBe('b')
    expect(topUnfinished(plan('d', [blk('a', 1, true)]))).toBeNull()
  })
  it('soft order always allows ticking but flags out-of-order', () => {
    expect(canTick(p, 'c', S())).toBe(true)
    expect(isOutOfOrder(p, 'c')).toBe(true)
    expect(isOutOfOrder(p, 'b')).toBe(false)
  })
  it('hard order only allows the top unfinished block', () => {
    const s = S({ ivyOrder: 'hard' })
    expect(canTick(p, 'c', s)).toBe(false)
    expect(canTick(p, 'b', s)).toBe(true)
  })
  it('un-ticking a done block is always allowed', () => {
    expect(canTick(p, 'a', S({ ivyOrder: 'hard' }))).toBe(true)
  })
})

describe('score', () => {
  it('is done / total', () => {
    expect(score(plan('d', [blk('a', 1, true), blk('b', 2)]))).toEqual({ done: 1, total: 2 })
    expect(score(undefined)).toEqual({ done: 0, total: 0 })
  })
})

describe('leftovers', () => {
  const a = item({ id: 'a' }), b = item({ id: 'b' }), c = item({ id: 'c', done: true })
  const items = [a, b, c]
  const plans = {
    '2026-09-29': plan('2026-09-29', [blk('x', 1, false, 'a')]),
    '2026-09-30': plan('2026-09-30', [blk('y', 2, false, 'b'), blk('z', 1, false, 'a'), blk('w', 3, false, 'c')]),
    '2026-10-01': plan('2026-10-01', []),
  }
  it('takes unfinished item blocks from the most recent past day with blocks, in old order', () => {
    expect(leftovers(plans, items, '2026-10-02').map((i) => i.id)).toEqual(['a', 'b'])
  })
  it('ignores the target day and future days', () => {
    expect(leftovers(plans, items, '2026-09-30').map((i) => i.id)).toEqual(['a'])
    expect(leftovers(plans, items, '2026-09-29')).toEqual([])
  })
  it('skips review blocks and items that are blocked or now non-leaf', () => {
    const p = { d1: plan('d1', [{ ...blk('r', 1), kind: 'review', itemId: undefined }, blk('q', 2, false, 'a')]) }
    expect(leftovers(p, items, 'd2').map((i) => i.id)).toEqual(['a'])
  })
})

describe('candidates', () => {
  const l = item({ id: 'left', grade: 'B', gradeRank: 1 })
  const due = item({ id: 'due', grade: 'C', gradeRank: 1, due: '2026-10-01' })
  const a1 = item({ id: 'a1', grade: 'A', gradeRank: 1 })
  const a2 = item({ id: 'a2', grade: 'A', gradeRank: 2, waitingOnId: 'a1' })
  const parent = item({ id: 'par', grade: 'A', gradeRank: 3 })
  const sub = item({ id: 'sub', parentId: 'par', grade: 'B', gradeRank: 2 })
  const planned = item({ id: 'planned', grade: 'A', gradeRank: 4 })
  const ungr = item({ id: 'ung' })
  const done = item({ id: 'done', grade: 'A', gradeRank: 5, done: true })
  const items = [l, due, a1, a2, parent, sub, planned, ungr, done]
  const plans = {
    '2026-10-01': plan('2026-10-01', [blk('x', 1, false, 'left')]),
    '2026-10-02': plan('2026-10-02', [blk('y', 1, false, 'planned')]),
  }
  const c = candidates(items, plans, '2026-10-02')
  const ids = (xs: { item: Item }[]) => xs.map((x) => x.item.id)
  it('groups leftovers first, then due/overdue, then grades', () => {
    expect(ids(c.leftovers)).toEqual(['left'])
    expect(ids(c.due)).toEqual(['due'])
    expect(ids(c.byGrade.A)).toEqual(['a1', 'a2'])
    expect(ids(c.byGrade.B)).toEqual(['sub'])
  })
  it('excludes non-leaf, done, ungraded and already-planned items', () => {
    const all = [...c.leftovers, ...c.due, ...Object.values(c.byGrade).flat()]
    const got = ids(all)
    for (const x of ['par', 'done', 'ung', 'planned']) expect(got).not.toContain(x)
  })
  it('flags blocked candidates instead of hiding them', () => {
    expect(c.byGrade.A.find((x) => x.item.id === 'a2')!.blocked).toBe(true)
    expect(c.byGrade.A.find((x) => x.item.id === 'a1')!.blocked).toBe(false)
  })
  it('filters by text', () => {
    const f = candidates(items, plans, '2026-10-02', 'zzz')
    expect(f.byGrade.A).toEqual([])
  })
})
