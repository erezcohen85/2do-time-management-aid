import type { Block } from '@/types'
import { schedule, type CalendarEvent } from './schedule'

const b = (id: string, rank: number, estimateMin: number, pinnedStart?: string): Block => ({
  id, kind: 'item', itemId: id, rank, estimateMin, pinnedStart, done: false,
})
const opts = { dayStart: '08:30', overflowAfter: '22:00' }
const ev = (id: string, s: string, e: string): CalendarEvent => ({ id, title: id, start: s, end: e })
const span = (r: ReturnType<typeof schedule>) => r.blocks.map((x) => [x.block.id, x.start, x.end])

describe('schedule', () => {
  it('stacks blocks in rank order from day start', () => {
    const r = schedule([b('b', 2, 60), b('a', 1, 45)], [], opts)
    expect(span(r)).toEqual([['a', '08:30', '09:15'], ['b', '09:15', '10:15']])
    expect(r.overflow).toBe(false)
    expect(r.totalMin).toBe(105)
  })

  it('flows unpinned blocks around calendar events', () => {
    const r = schedule([b('a', 1, 60), b('b', 2, 30)], [ev('standup', '09:00', '09:30')], opts)
    // a (60m) does not fit before 09:00 -> starts after event
    expect(span(r)).toEqual([['a', '09:30', '10:30'], ['b', '10:30', '11:00']])
  })

  it('uses a gap before an event when the block fits', () => {
    const r = schedule([b('a', 1, 30), b('b', 2, 60)], [ev('x', '09:00', '10:00')], opts)
    expect(span(r)).toEqual([['a', '08:30', '09:00'], ['b', '10:00', '11:00']])
  })

  it('keeps pinned blocks fixed and flows others around them', () => {
    const r = schedule([b('a', 1, 60), b('p', 2, 60, '09:00'), b('c', 3, 30)], [], opts)
    const m = Object.fromEntries(r.blocks.map((x) => [x.block.id, [x.start, x.end]]))
    expect(m.p).toEqual(['09:00', '10:00'])
    expect(m.a).toEqual(['10:00', '11:00'])
    expect(m.c).toEqual(['11:00', '11:30'])
  })

  it('places an unpinned block before a pin when it fits', () => {
    const r = schedule([b('a', 1, 30), b('p', 2, 60, '10:00')], [], opts)
    const m = Object.fromEntries(r.blocks.map((x) => [x.block.id, [x.start, x.end]]))
    expect(m.a).toEqual(['08:30', '09:00'])
    expect(m.p).toEqual(['10:00', '11:00'])
  })

  it('returns blocks sorted by start time', () => {
    const r = schedule([b('a', 1, 60), b('p', 2, 30, '08:30')], [], opts)
    expect(r.blocks.map((x) => x.block.id)).toEqual(['p', 'a'])
  })

  it('flags pinned blocks that collide with events or other pins', () => {
    const r = schedule([b('p', 1, 60, '09:00'), b('q', 2, 60, '09:30')], [ev('e', '08:00', '09:15')], opts)
    expect(r.blocks.find((x) => x.block.id === 'p')!.conflict).toBe(true)
    expect(r.blocks.find((x) => x.block.id === 'q')!.conflict).toBe(true)
  })

  it('flags overflow when the last block ends after the cutoff', () => {
    const r = schedule([b('a', 1, 14 * 60)], [], opts)
    expect(r.overflow).toBe(true)
    expect(r.endMin).toBe(22 * 60 + 30)
  })

  it('does not flag when exactly at the cutoff', () => {
    const r = schedule([b('a', 1, 13 * 60 + 30)], [], opts)
    expect(r.endMin).toBe(22 * 60)
    expect(r.overflow).toBe(false)
  })

  it('handles empty plans', () => {
    const r = schedule([], [ev('e', '09:00', '10:00')], opts)
    expect(r.blocks).toEqual([])
    expect(r.overflow).toBe(false)
    expect(r.endMin).toBe(510)
  })

  it('ignores events fully before day start for stacking', () => {
    const r = schedule([b('a', 1, 30)], [ev('early', '06:00', '07:00')], opts)
    expect(span(r)).toEqual([['a', '08:30', '09:00']])
  })
})
