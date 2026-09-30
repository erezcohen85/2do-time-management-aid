import type { DayPlan, Item, TimerSession } from '@/types'
import { DEFAULT_SETTINGS } from '@/data/defaults'
import { activeProjectsForReview, insertReviewBlock, isReviewDay, scorecard } from './review'

const S = DEFAULT_SETTINGS
const plan = (date: string, blocks: DayPlan['blocks'] = []): DayPlan => ({ date, blocks, locked: false, pushed: false })
const ib = (id: string, rank: number, done = false) => ({
  id, kind: 'item' as const, itemId: id, rank, estimateMin: 30, done,
})

describe('review block insertion', () => {
  it('knows the review day (Thursday by default)', () => {
    expect(isReviewDay('2026-10-01', S)).toBe(true)
    expect(isReviewDay('2026-10-02', S)).toBe(false)
  })
  it('inserts at rank 1, shifting existing blocks, pinned to review time', () => {
    const r = insertReviewBlock(plan('2026-10-01', [ib('a', 1), ib('b', 2)]), S, { id: 'rv' })!
    const review = r.blocks.find((b) => b.kind === 'review')!
    expect(review).toMatchObject({ rank: 1, estimateMin: 45, pinnedStart: '08:30', done: false })
    expect(r.blocks.find((b) => b.id === 'a')!.rank).toBe(2)
    expect(r.blocks.find((b) => b.id === 'b')!.rank).toBe(3)
  })
  it('returns null on non-review days or when a review block already exists', () => {
    expect(insertReviewBlock(plan('2026-10-02'), S, { id: 'x' })).toBeNull()
    const has = insertReviewBlock(plan('2026-10-01'), S, { id: 'x' })!
    expect(insertReviewBlock(has, S, { id: 'y' })).toBeNull()
  })
})

describe('scorecard', () => {
  const mkItem = (id: string, grade: Item['grade'], doneAt?: string): Item => ({
    id, projectId: null, parentId: null, title: id, grade, gradeRank: 1, checklist: [], links: [],
    carryOver: 0, done: !!doneAt, doneAt, createdAt: '2026-09-01T00:00:00Z',
  })
  const plans = {
    '2026-09-27': plan('2026-09-27', [ib('a', 1, true), ib('b', 2, true)]),
    '2026-09-28': plan('2026-09-28', [ib('c', 1, true), ib('d', 2)]),
    '2026-10-05': plan('2026-10-05', [ib('z', 1, true)]), // next week
  }
  const items = [
    mkItem('a', 'A', '2026-09-27T10:00:00'),
    mkItem('b', 'B', '2026-09-27T11:00:00'),
    mkItem('c', 'A', '2026-09-28T10:00:00'),
    mkItem('z', 'A', '2026-10-05T10:00:00'),
  ]
  const sessions: TimerSession[] = [
    { id: '1', mode: 'pomodoro', start: '2026-09-27T09:00:00', end: '2026-09-27T09:25:00', itemId: 'a' },
    { id: '2', mode: 'stopwatch', start: '2026-09-28T09:00:00', end: '2026-09-28T09:10:00' },
    { id: '3', mode: 'stopwatch', start: '2026-10-05T09:00:00', end: '2026-10-05T10:00:00' },
    { id: '4', mode: 'stopwatch', start: '2026-09-29T09:00:00' }, // open session ignored
  ]
  const sc = scorecard('2026-09-27', S.visibleDays, plans, items, sessions)
  it('scores each day', () => {
    expect(sc.days.find((d) => d.date === '2026-09-27')).toMatchObject({ done: 2, total: 2 })
    expect(sc.days.find((d) => d.date === '2026-09-28')).toMatchObject({ done: 1, total: 2 })
    expect(sc.days.find((d) => d.date === '2026-09-29')).toMatchObject({ done: 0, total: 0 })
  })
  it('counts full days, done per grade and timer minutes inside the week', () => {
    expect(sc.fullDays).toBe(1)
    expect(sc.doneByGrade).toMatchObject({ A: 2, B: 1, C: 0 })
    expect(sc.taggedMin).toBe(25)
    expect(sc.untaggedMin).toBe(10)
  })
})

describe('activeProjectsForReview', () => {
  it('lists non-archived projects that have open items', () => {
    const projects = [
      { id: 'p1', areaId: 'a', name: 'P1', order: 1, archived: false },
      { id: 'p2', areaId: 'a', name: 'P2', order: 2, archived: false },
      { id: 'p3', areaId: 'a', name: 'P3', order: 3, archived: true },
    ]
    const it = (id: string, projectId: string, done = false) => ({
      id, projectId, parentId: null, title: id, grade: null, gradeRank: 0, checklist: [], links: [],
      carryOver: 0, done, createdAt: 'x',
    }) as Item
    const r = activeProjectsForReview(projects, [it('1', 'p1'), it('2', 'p2', true), it('3', 'p3')])
    expect(r.map((p) => p.id)).toEqual(['p1'])
  })
})
