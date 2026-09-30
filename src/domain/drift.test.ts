import type { Block } from '@/types'
import { drift } from './drift'
import { schedule } from './schedule'

const b = (id: string, rank: number, est: number, done = false): Block => ({ id, kind: 'item', itemId: id, rank, estimateMin: est, done })
const opts = { dayStart: '08:30', overflowAfter: '22:00' }
const at = (h: number, m = 0) => h * 60 + m

describe('drift', () => {
  // a 08:30-09:30, b 09:30-10:00
  const blocks = [b('a', 1, 60), b('b', 2, 30)]
  const run = (bs: Block[], now: number) => drift(schedule(bs, [], opts), now)

  it('is on track while inside the top unfinished block', () => {
    expect(run(blocks, at(9, 0))).toEqual({ kind: 'onTrack', minutes: 0 })
  })
  it('is behind by now minus the scheduled end of the top unfinished block', () => {
    expect(run(blocks, at(9, 50))).toEqual({ kind: 'behind', minutes: 20 })
  })
  it('measures against the top UNFINISHED block', () => {
    expect(run([b('a', 1, 60, true), b('b', 2, 30)], at(9, 50))).toEqual({ kind: 'onTrack', minutes: 0 })
    expect(run([b('a', 1, 60, true), b('b', 2, 30)], at(10, 20))).toEqual({ kind: 'behind', minutes: 20 })
  })
  it('is ahead when the next unfinished block has not started yet', () => {
    expect(run([b('a', 1, 60, true), b('b', 2, 30)], at(9, 10))).toEqual({ kind: 'ahead', minutes: 20 })
  })
  it('is none when nothing is left to do or nothing is planned', () => {
    expect(run([b('a', 1, 60, true)], at(12))).toEqual({ kind: 'none', minutes: 0 })
    expect(run([], at(12))).toEqual({ kind: 'none', minutes: 0 })
  })
  it('respects pinned blocks', () => {
    const pinned: Block = { ...b('p', 1, 30), pinnedStart: '14:00' }
    expect(run([pinned], at(13, 0))).toEqual({ kind: 'ahead', minutes: 60 })
    expect(run([pinned], at(15, 0))).toEqual({ kind: 'behind', minutes: 30 })
  })
})
