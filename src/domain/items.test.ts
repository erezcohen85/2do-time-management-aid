import type { Item } from '@/types'
import {
  childrenOf, isBlocked, isLeaf, isPlannable, nextGradeRank, rankLabel, rankedByGrade,
  reorderInGrade, smartCount, smartProgress, ungraded,
} from './items'

let n = 0
const mk = (p: Partial<Item> = {}): Item => ({
  id: `i${++n}`, projectId: null, parentId: null, title: 't', grade: null, gradeRank: 0,
  checklist: [], links: [], carryOver: 0, done: false, createdAt: '2026-01-01T00:00:00Z', ...p,
})

describe('leaf rule', () => {
  it('task without subtasks is a leaf; with subtasks is not; subtask is a leaf', () => {
    const parent = mk({ id: 'p' })
    const sub = mk({ id: 's', parentId: 'p' })
    const solo = mk({ id: 'solo' })
    const items = [parent, sub, solo]
    expect(isLeaf(parent, items)).toBe(false)
    expect(isLeaf(sub, items)).toBe(true)
    expect(isLeaf(solo, items)).toBe(true)
    expect(childrenOf('p', items)).toEqual([sub])
  })
  it('only open, unblocked leaves are plannable', () => {
    const blocker = mk({ id: 'b' })
    const blocked = mk({ id: 'x', waitingOnId: 'b' })
    const done = mk({ id: 'd', done: true })
    const items = [blocker, blocked, done]
    expect(isBlocked(blocked, items)).toBe(true)
    expect(isPlannable(blocked, items)).toBe(false)
    expect(isPlannable(done, items)).toBe(false)
    expect(isPlannable(blocker, items)).toBe(true)
  })
  it('unblocks when the blocker is done or missing', () => {
    const blocker = mk({ id: 'b', done: true })
    const x = mk({ id: 'x', waitingOnId: 'b' })
    expect(isBlocked(x, [blocker, x])).toBe(false)
    expect(isBlocked(mk({ waitingOnId: 'gone' }), [])).toBe(false)
  })
})

describe('grade ranking', () => {
  const a1 = mk({ id: 'a1', grade: 'A', gradeRank: 1 })
  const a2 = mk({ id: 'a2', grade: 'A', gradeRank: 2 })
  const a3 = mk({ id: 'a3', grade: 'A', gradeRank: 3 })
  const b1 = mk({ id: 'b1', grade: 'B', gradeRank: 1 })
  const dn = mk({ id: 'dn', grade: 'A', gradeRank: 0, done: true })
  const un = mk({ id: 'un' })
  const items = [a3, a1, b1, a2, dn, un]

  it('orders open items of a grade by rank, ignoring done', () => {
    expect(rankedByGrade(items, 'A').map((i) => i.id)).toEqual(['a1', 'a2', 'a3'])
  })
  it('lists ungraded open items', () => {
    expect(ungraded(items).map((i) => i.id)).toEqual(['un'])
  })
  it('labels rank as grade + position', () => {
    expect(rankLabel(a2, items)).toBe('A2')
    expect(rankLabel(un, items)).toBeNull()
  })
  it('appends to end of grade', () => {
    expect(nextGradeRank(items, 'A')).toBe(4)
    expect(nextGradeRank(items, 'C')).toBe(1)
  })
  it('reorders within a grade and renumbers 1..n', () => {
    const r = reorderInGrade(items, 'a3', 'A', 0)
    expect(r.filter((i) => i.grade === 'A' && !i.done).sort((x, y) => x.gradeRank - y.gradeRank).map((i) => i.id))
      .toEqual(['a3', 'a1', 'a2'])
    expect(r.find((i) => i.id === 'a3')!.gradeRank).toBe(1)
  })
  it('moves an item across grades', () => {
    const r = reorderInGrade(items, 'a1', 'B', 1)
    expect(rankedByGrade(r, 'B').map((i) => i.id)).toEqual(['b1', 'a1'])
    expect(rankedByGrade(r, 'A').map((i) => i.id)).toEqual(['a2', 'a3'])
    expect(rankedByGrade(r, 'A').map((i) => i.gradeRank)).toEqual([1, 2])
  })
  it('clamps out-of-range index', () => {
    const r = reorderInGrade(items, 'a1', 'A', 99)
    expect(rankedByGrade(r, 'A').map((i) => i.id)).toEqual(['a2', 'a3', 'a1'])
  })
})

describe('SMART', () => {
  it('counts filled fields with T = due', () => {
    expect(smartCount(undefined, undefined)).toBe(0)
    expect(smartCount({ specific: 'x', metric: 'm', target: 5 }, '2026-10-05')).toBe(3)
    expect(smartCount({ specific: ' ', achievable: 'y', relevant: 'z' }, undefined)).toBe(2)
  })
  it('computes measurable progress 0..1', () => {
    expect(smartProgress({ target: 10, current: 4 })).toBeCloseTo(0.4)
    expect(smartProgress({ target: 10, current: 15 })).toBe(1)
    expect(smartProgress({ target: 0, current: 1 })).toBeNull()
    expect(smartProgress({ metric: 'x' })).toBeNull()
    expect(smartProgress(undefined)).toBeNull()
    expect(smartProgress({ target: 10 })).toBe(0)
  })
})
