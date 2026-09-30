import type { DayPlan } from '@/types'
import { DEFAULT_SETTINGS } from '@/data/defaults'
import { reviewIsDue, ritualDue } from './ritual'

const S = DEFAULT_SETTINGS
const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m)
const plan = (date: string, n: number): DayPlan => ({
  date, locked: false, pushed: false,
  blocks: Array.from({ length: n }, (_, i) => ({ id: `b${i}`, kind: 'item' as const, itemId: `i${i}`, rank: i + 1, estimateMin: 30, done: false })),
})

describe('ritualDue', () => {
  it('evening: due after the reminder time, targeting tomorrow', () => {
    expect(ritualDue(at(1, 21, 0), S, {})).toEqual({ due: true, target: '2026-10-02' })
    expect(ritualDue(at(1, 20, 59), S, {})).toMatchObject({ due: false })
  })
  it('is not due when tomorrow is already planned', () => {
    expect(ritualDue(at(1, 22), S, { '2026-10-02': plan('2026-10-02', 2) })).toMatchObject({ due: false })
    expect(ritualDue(at(1, 22), S, { '2026-10-02': plan('2026-10-02', 0) })).toMatchObject({ due: true })
  })
  it('is not due once handled today', () => {
    expect(ritualDue(at(1, 22), S, {}, '2026-10-01')).toMatchObject({ due: false })
    expect(ritualDue(at(1, 22), S, {}, '2026-09-30')).toMatchObject({ due: true })
  })
  it('morning mode targets today; anytime and disabled reminders never fire', () => {
    const morning = { ...S, ritual: { mode: 'morning' as const, time: '07:30', reminder: true } }
    expect(ritualDue(at(1, 7, 30), morning, {})).toEqual({ due: true, target: '2026-10-01' })
    expect(ritualDue(at(1, 7, 29), morning, {})).toMatchObject({ due: false })
    expect(ritualDue(at(1, 23), { ...S, ritual: { ...S.ritual, mode: 'anytime' } }, {})).toMatchObject({ due: false })
    expect(ritualDue(at(1, 23), { ...S, ritual: { ...S.ritual, reminder: false } }, {})).toMatchObject({ due: false })
  })
})

describe('reviewIsDue', () => {
  it('is due on the review day until the review is completed', () => {
    expect(reviewIsDue(at(1, 9), S, {})).toBe(true)
    expect(reviewIsDue(at(2, 9), S, {})).toBe(false)
    expect(reviewIsDue(at(1, 9), S, { '2026-09-27': { weekStart: '2026-09-27', projectNotes: {}, completedAt: 'x' } })).toBe(false)
  })
})
