import type { Block } from '@/types'
import { schedule } from '@/domain/schedule'
import { desiredEvents, planSync } from './sync'

const b = (id: string, rank: number, est: number, extra: Partial<Block> = {}): Block => ({
  id, kind: 'item', itemId: id, rank, estimateMin: est, done: false, ...extra,
})
const opts = { dayStart: '08:30', overflowAfter: '22:00' }
const D = '2026-10-01'
const titles: Record<string, string> = { a: 'Landing copy', b: 'Call accountant', r: 'Weekly review' }
const titleOf = (x: Block) => titles[x.itemId ?? x.id] ?? 'x'
const desire = (blocks: Block[]) => desiredEvents(D, schedule(blocks, [], opts).blocks, blocks, titleOf)
const at = (hm: string) => new Date(`${D}T${hm}:00`).toISOString()

describe('desiredEvents', () => {
  it('titles are "N. title" by rank, with times from the schedule', () => {
    const d = desire([b('b', 2, 30), b('a', 1, 60)])
    expect(d.map((x) => x.input.summary)).toEqual(['1. Landing copy', '2. Call accountant'])
    expect(d[0].input.start.dateTime).toBe(at('08:30'))
    expect(d[0].input.end.dateTime).toBe(at('09:30'))
    expect(d[1].input.start.dateTime).toBe(at('09:30'))
  })
  it('done blocks get a ✔ prefix', () => {
    expect(desire([b('a', 1, 30, { done: true })])[0].input.summary).toBe('✔ 1. Landing copy')
  })
  it('includes a time zone', () => {
    expect(desire([b('a', 1, 30)])[0].input.start.timeZone).toBeTruthy()
  })
  it('respects pinned times', () => {
    const d = desire([b('a', 1, 30, { pinnedStart: '14:00' })])
    expect(d[0].input.start.dateTime).toBe(at('14:00'))
  })
})

describe('planSync', () => {
  it('first push creates an event per block', () => {
    const blocks = [b('a', 1, 60), b('b', 2, 30)]
    const ops = planSync(desire(blocks), blocks, [])
    expect(ops.map((o) => o.type)).toEqual(['create', 'create'])
    expect(ops[0]).toMatchObject({ blockId: 'a', sig: expect.any(String) })
  })
  it('does nothing when signatures match', () => {
    const fresh = [b('a', 1, 60), b('b', 2, 30)]
    const d = desire(fresh)
    const synced = fresh.map((blk, i) => ({ ...blk, gcalEventId: `e${i}`, gcalSig: d[i].sig }))
    expect(planSync(d, synced, [])).toEqual([])
  })
  it('updates only blocks whose title or time changed', () => {
    const fresh = [b('a', 1, 60), b('b', 2, 30)]
    const d0 = desire(fresh)
    const synced = fresh.map((blk, i) => ({ ...blk, gcalEventId: `e${i}`, gcalSig: d0[i].sig }))
    // reorder: b first -> both titles and times change
    const reordered = [{ ...synced[0], rank: 2 }, { ...synced[1], rank: 1 }]
    const ops = planSync(desire(reordered), reordered, [])
    expect(ops.map((o) => o.type)).toEqual(['update', 'update'])
    // tick a done: only a changes
    const ticked = synced.map((x) => (x.id === 'a' ? { ...x, done: true } : x))
    const ops2 = planSync(desire(ticked), ticked, [])
    expect(ops2).toHaveLength(1)
    expect(ops2[0]).toMatchObject({ type: 'update', blockId: 'a', eventId: 'e0' })
    expect((ops2[0] as { input: { summary: string } }).input.summary).toBe('✔ 1. Landing copy')
  })
  it('creates events for new blocks next to existing ones and deletes orphans', () => {
    const fresh = [b('a', 1, 60)]
    const d0 = desire(fresh)
    const plan = [{ ...fresh[0], gcalEventId: 'e0', gcalSig: d0[0].sig }, b('b', 2, 30)]
    const ops = planSync(desire(plan), plan, ['gone1', 'gone2'])
    expect(ops.map((o) => o.type).sort()).toEqual(['create', 'delete', 'delete'])
    expect(ops.filter((o) => o.type === 'delete').map((o) => (o as { eventId: string }).eventId)).toEqual(['gone1', 'gone2'])
  })
})
