import type { Db } from '@/types'
import { emptyDb } from './defaults'
import * as m from './mutations'
import { makeItem } from './mutations'

const mk = (id: string, p: Partial<Parameters<typeof makeItem>[0]> = {}) => makeItem({ id, title: id, ...p }, '2026-01-01T00:00:00Z')
const withItems = (...items: ReturnType<typeof mk>[]): Db => ({ ...emptyDb(), items })
const D = '2026-10-02'

describe('areas and projects', () => {
  it('adds with incremental order; deleting an area frees its items', () => {
    let db = m.addArea(emptyDb(), { id: 'a1', name: 'Home' })
    db = m.addArea(db, { id: 'a2', name: 'Work' })
    expect(db.areas.map((a) => a.order)).toEqual([1, 2])
    db = m.addProject(db, { id: 'p1', areaId: 'a1', name: 'Admin' })
    db = m.addItem(db, mk('t1', { projectId: 'p1' }))
    db = m.deleteArea(db, 'a1')
    expect(db.areas.map((a) => a.id)).toEqual(['a2'])
    expect(db.projects).toEqual([])
    expect(db.items[0].projectId).toBeNull()
  })
  it('renames and updates', () => {
    let db = m.addArea(emptyDb(), { id: 'a1', name: 'Home' })
    db = m.renameArea(db, 'a1', 'House')
    db = m.addProject(db, { id: 'p1', areaId: 'a1', name: 'X' })
    db = m.updateProject(db, 'p1', { archived: true, due: '2026-12-01' })
    expect(db.areas[0].name).toBe('House')
    expect(db.projects[0]).toMatchObject({ archived: true, due: '2026-12-01' })
  })
})

describe('items', () => {
  it('new items are ungraded', () => {
    const db = m.addItem(emptyDb(), makeItem({ id: 'x', title: 'Call bank' }))
    expect(db.items[0]).toMatchObject({ grade: null, done: false, carryOver: 0 })
  })
  it('grading appends at the end of the grade; ungrading clears rank', () => {
    let db = withItems(mk('a'), mk('b'), mk('c'))
    db = m.setGrade(db, 'a', 'A')
    db = m.setGrade(db, 'b', 'A')
    expect(db.items.map((i) => [i.id, i.gradeRank])).toEqual([['a', 1], ['b', 2], ['c', 0]])
    db = m.setGrade(db, 'a', null)
    expect(db.items[0]).toMatchObject({ grade: null, gradeRank: 0 })
  })
  it('moveInGrade reranks', () => {
    let db = withItems(mk('a'), mk('b'), mk('c'))
    for (const id of ['a', 'b', 'c']) db = m.setGrade(db, id, 'B')
    db = m.moveInGrade(db, 'c', 'B', 0)
    expect(db.items.filter((i) => i.grade === 'B').sort((x, y) => x.gradeRank - y.gradeRank).map((i) => i.id)).toEqual(['c', 'a', 'b'])
  })
  it('deleting removes subtasks, blocks, waiting-on refs and session tags', () => {
    let db = withItems(mk('t'), mk('s', { parentId: 't' }), mk('w', { waitingOnId: 't' }))
    db = m.addSession(db, { id: 'se', mode: 'stopwatch', start: 'x', itemId: 's' })
    db = m.addItemBlock(db, D, 's', { id: 'b1' })
    db = m.deleteItem(db, 't')
    expect(db.items.map((i) => i.id)).toEqual(['w'])
    expect(db.items[0].waitingOnId).toBeUndefined()
    expect(db.plans[D].blocks).toEqual([])
    expect(db.sessions[0].itemId).toBeUndefined()
  })
  it('done toggles doneAt and block state everywhere', () => {
    let db = withItems(mk('a'))
    db = m.addItemBlock(db, D, 'a', { id: 'b1' })
    db = m.setItemDone(db, 'a', true, 'NOW')
    expect(db.items[0]).toMatchObject({ done: true, doneAt: 'NOW' })
    expect(db.plans[D].blocks[0].done).toBe(true)
    db = m.setItemDone(db, 'a', false)
    expect(db.items[0].doneAt).toBeUndefined()
    expect(db.plans[D].blocks[0].done).toBe(false)
  })
})

describe('moveItemToProject', () => {
  it('moves a task together with its subtasks', () => {
    const db = m.moveItemToProject(withItems(mk('t'), mk('s', { parentId: 't' }), mk('o')), 't', 'p1')
    expect(db.items.map((i) => i.projectId)).toEqual(['p1', 'p1', null])
    expect(m.moveItemToProject(db, 't', null).items[1].projectId).toBeNull()
  })
})

describe('plan blocks', () => {
  it('adds with default estimate, stores it on the item, ranks sequentially', () => {
    let db = withItems(mk('a'), mk('b', { estimateMin: 90 }))
    db = m.addItemBlock(db, D, 'a', { id: 'b1' })
    db = m.addItemBlock(db, D, 'b', { id: 'b2' })
    expect(db.plans[D].blocks.map((b) => [b.itemId, b.rank, b.estimateMin])).toEqual([['a', 1, 30], ['b', 2, 90]])
    expect(db.items[0].estimateMin).toBe(30)
  })
  it('refuses non-leaf, blocked, done and duplicate items', () => {
    const base = withItems(mk('p'), mk('s', { parentId: 'p' }), mk('blocker'), mk('w', { waitingOnId: 'blocker' }), mk('d', { done: true }))
    expect(m.addItemBlock(base, D, 'p', { id: 'x' })).toBe(base)
    expect(m.addItemBlock(base, D, 'w', { id: 'x' })).toBe(base)
    expect(m.addItemBlock(base, D, 'd', { id: 'x' })).toBe(base)
    const once = m.addItemBlock(base, D, 's', { id: 'x' })
    expect(m.addItemBlock(once, D, 's', { id: 'y' })).toBe(once)
  })
  it('hard cap refuses the 7th, soft cap allows it', () => {
    let db = withItems(...Array.from({ length: 7 }, (_, i) => mk(`i${i}`)))
    for (let i = 0; i < 6; i++) db = m.addItemBlock(db, D, `i${i}`, { id: `b${i}` })
    expect(m.addItemBlock(db, D, 'i6', { id: 'b6' })).toBe(db)
    db = m.updateSettings(db, { ivyCap: 'soft' })
    expect(m.addItemBlock(db, D, 'i6', { id: 'b6' }).plans[D].blocks).toHaveLength(7)
  })
  it('locked days reject edits but can be unlocked', () => {
    let db = withItems(mk('a'), mk('b'))
    db = m.addItemBlock(db, D, 'a', { id: 'b1' })
    db = m.setLocked(db, D, true)
    expect(m.addItemBlock(db, D, 'b', { id: 'b2' })).toBe(db)
    expect(m.removeBlock(db, D, 'b1')).toBe(db)
    db = m.setLocked(db, D, false)
    expect(m.removeBlock(db, D, 'b1').plans[D].blocks).toEqual([])
  })
  it('moves, renumbers after removal, pins and sets estimates', () => {
    let db = withItems(mk('a'), mk('b'), mk('c'))
    for (const id of ['a', 'b', 'c']) db = m.addItemBlock(db, D, id, { id: `b-${id}` })
    db = m.moveBlock(db, D, 'b-c', 0)
    expect(db.plans[D].blocks.map((b) => [b.id, b.rank])).toEqual([['b-c', 1], ['b-a', 2], ['b-b', 3]])
    db = m.removeBlock(db, D, 'b-a')
    expect(db.plans[D].blocks.map((b) => b.rank).sort()).toEqual([1, 2])
    db = m.pinBlock(db, D, 'b-b', '10:00')
    expect(db.plans[D].blocks.find((b) => b.id === 'b-b')!.pinnedStart).toBe('10:00')
    db = m.pinBlock(db, D, 'b-b', undefined)
    expect(db.plans[D].blocks.find((b) => b.id === 'b-b')!.pinnedStart).toBeUndefined()
    db = m.setBlockEstimate(db, D, 'b-b', 50)
    expect(db.plans[D].blocks.find((b) => b.id === 'b-b')!.estimateMin).toBe(50)
  })
  it('ticking a block ticks its item', () => {
    let db = withItems(mk('a'))
    db = m.addItemBlock(db, D, 'a', { id: 'b1' })
    db = m.setBlockDone(db, D, 'b1', true, 'NOW')
    expect(db.items[0].done).toBe(true)
  })
  it('leftover re-added on the next day increments carry-over', () => {
    let db = withItems(mk('a'), mk('b'))
    db = m.addItemBlock(db, '2026-10-01', 'a', { id: 'b1' })
    db = m.addItemBlock(db, '2026-10-01', 'b', { id: 'b2' })
    db = m.setBlockDone(db, '2026-10-01', 'b2', true)
    db = m.addItemBlock(db, D, 'a', { id: 'b3' })
    expect(db.items.find((i) => i.id === 'a')!.carryOver).toBe(1)
    expect(db.items.find((i) => i.id === 'b')!.carryOver).toBe(0)
  })
})

describe('weekly review', () => {
  it('inserts the review block once per week, even if removed', () => {
    let db = withItems(mk('a'))
    db = m.addItemBlock(db, '2026-10-01', 'a', { id: 'b1' })
    db = m.ensureReviewBlock(db, '2026-10-01', 'rv')
    expect(db.plans['2026-10-01'].blocks.find((b) => b.kind === 'review')!.rank).toBe(1)
    expect(db.reviews['2026-09-27'].blockInserted).toBe(true)
    db = m.removeBlock(db, '2026-10-01', 'rv')
    expect(m.ensureReviewBlock(db, '2026-10-01', 'rv2')).toBe(db)
  })
  it('does nothing on other days', () => {
    const db = emptyDb()
    expect(m.ensureReviewBlock(db, '2026-10-02', 'rv')).toBe(db)
  })
  it('ticking the review block completes the review', () => {
    let db = m.ensureReviewBlock(emptyDb(), '2026-10-01', 'rv')
    db = m.setBlockDone(db, '2026-10-01', 'rv', true, 'NOW')
    expect(db.reviews['2026-09-27'].completedAt).toBe('NOW')
  })
  it('completing the review ticks the review block, and un-completing reopens it', () => {
    let db = m.ensureReviewBlock(emptyDb(), '2026-10-01', 'rv')
    db = m.setReviewComplete(db, '2026-09-27', true, 'NOW')
    expect(db.reviews['2026-09-27'].completedAt).toBe('NOW')
    expect(db.plans['2026-10-01'].blocks[0].done).toBe(true)
    db = m.setReviewComplete(db, '2026-09-27', false)
    expect(db.reviews['2026-09-27'].completedAt).toBeUndefined()
    expect(db.plans['2026-10-01'].blocks[0].done).toBe(false)
  })
  it('completing without a block still records completion', () => {
    const db = m.setReviewComplete(emptyDb(), '2026-09-27', true, 'NOW')
    expect(db.reviews['2026-09-27'].completedAt).toBe('NOW')
    expect(db.plans).toEqual({})
  })
  it('stores reflection and project notes per week', () => {
    let db = m.updateReview(emptyDb(), '2026-09-27', { wentWell: 'x' })
    db = m.setProjectNote(db, '2026-09-27', 'p1', 'note')
    expect(db.reviews['2026-09-27']).toMatchObject({ wentWell: 'x', projectNotes: { p1: 'note' } })
  })
})

describe('settings', () => {
  it('deep-merges nested groups without losing siblings', () => {
    const db = m.updateSettings(emptyDb(), { ritual: { time: '20:00' }, timer: { pomodoro: { workMin: 50 } }, theme: 'dark' })
    expect(db.settings.ritual).toEqual({ mode: 'evening', time: '20:00', reminder: true })
    expect(db.settings.timer.pomodoro).toMatchObject({ workMin: 50, shortBreakMin: 5 })
    expect(db.settings.timer.sound).toBe(true)
    expect(db.settings.theme).toBe('dark')
  })
  it('replaces arrays wholesale', () => {
    const db = m.updateSettings(emptyDb(), { visibleDays: [1, 2, 3] })
    expect(db.settings.visibleDays).toEqual([1, 2, 3])
  })
})

describe('sessions', () => {
  it('ends a session once', () => {
    let db = m.addSession(emptyDb(), { id: 's', mode: 'pomodoro', start: 'a' })
    db = m.endSession(db, 's', 'b')
    db = m.endSession(db, 's', 'c')
    expect(db.sessions[0].end).toBe('b')
  })
})
