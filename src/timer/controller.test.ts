import { emptyDb } from '@/data/defaults'
import { createStore, type Store } from '@/data/store'
import type { Persistence } from '@/data/persistence'
import type { Db } from '@/types'
import { createTimerController, type Alerter } from './controller'

const MIN = 60_000
let clock = 10 * 60 * MIN
let n = 0
let store: Store
let ended: string[]
const memory = (): Persistence => {
  let db: Db = emptyDb()
  return { load: () => db, save: (d) => { db = d } }
}
const alerter: Alerter = { phaseEnded: (e) => void ended.push(e.phase) }
const ctl = () => createTimerController({ store, now: () => clock, random: () => 0.5, id: () => `s${++n}`, alerter })
const sessions = () => store.getState().sessions
const timer = () => store.getState().timer

beforeEach(() => {
  clock = 10 * 60 * MIN
  n = 0
  ended = []
  store = createStore(memory())
})

describe('timer controller', () => {
  it('start opens a tagged session and persists the state', () => {
    ctl().start({ mode: 'pomodoro', itemId: 'i1' })
    expect(timer()).toMatchObject({ mode: 'pomodoro', phase: 'work', status: 'running', itemId: 'i1', sessionId: 's1' })
    expect(sessions()).toEqual([{ id: 's1', mode: 'pomodoro', start: new Date(clock).toISOString(), itemId: 'i1' }])
  })

  it('pause closes the session; resume opens a new one', () => {
    const c = ctl()
    c.start({ mode: 'stopwatch' })
    clock += 5 * MIN
    c.pause()
    expect(timer()).toMatchObject({ status: 'paused', sessionId: undefined })
    expect(sessions()[0].end).toBe(new Date(clock).toISOString())
    clock += 20 * MIN
    c.resume()
    expect(sessions()).toHaveLength(2)
    expect(timer()!.sessionId).toBe('s2')
    clock += 3 * MIN
    c.stop()
    expect(timer()).toBeNull()
    expect(sessions()[1].end).toBe(new Date(clock).toISOString())
  })

  it('tick ends a pomodoro work phase at its true end, logs it, alerts and readies the break', () => {
    const c = ctl()
    c.start({ mode: 'pomodoro', itemId: 'i1' })
    const startAt = clock
    clock += 40 * MIN // tab was asleep
    c.tick()
    expect(sessions()[0].end).toBe(new Date(startAt + 25 * MIN).toISOString())
    expect(ended).toEqual(['work'])
    expect(timer()).toMatchObject({ phase: 'shortBreak', status: 'paused', cycle: 1, itemId: 'i1' })
    c.tick()
    expect(ended).toEqual(['work'])
  })

  it('breaks are not logged as sessions', () => {
    const c = ctl()
    c.start({ mode: 'pomodoro' })
    clock += 25 * MIN
    c.tick()
    c.resume()
    expect(timer()!.sessionId).toBeUndefined()
    expect(sessions()).toHaveLength(1)
    clock += 5 * MIN
    c.tick()
    expect(ended).toEqual(['work', 'shortBreak'])
    expect(timer()).toMatchObject({ phase: 'work', status: 'paused' })
    c.resume()
    expect(sessions()).toHaveLength(2)
  })

  it('countdown finishes and the session ends at the countdown end', () => {
    const c = ctl()
    c.start({ mode: 'countdown', countdownMin: 10 })
    clock += 11 * MIN
    c.tick()
    expect(timer()!.status).toBe('finished')
    expect(ended).toEqual(['countdown'])
    c.stop()
    expect(timer()).toBeNull()
  })

  it('setTag splits the running session', () => {
    const c = ctl()
    c.start({ mode: 'stopwatch' })
    clock += 4 * MIN
    c.setTag('i9')
    expect(sessions()).toHaveLength(2)
    expect(sessions()[0]).toMatchObject({ itemId: undefined, end: new Date(clock).toISOString() })
    expect(sessions()[1]).toMatchObject({ itemId: 'i9' })
    expect(timer()!.itemId).toBe('i9')
  })

  it('starting a new timer closes the old session', () => {
    const c = ctl()
    c.start({ mode: 'stopwatch' })
    clock += MIN
    c.start({ mode: 'pomodoro' })
    expect(sessions()[0].end).toBeDefined()
    expect(sessions()).toHaveLength(2)
  })

  it('uses a snapshot of the settings at start', () => {
    store.update((db) => ({ ...db, settings: { ...db.settings, timer: { ...db.settings.timer, pomodoro: { ...db.settings.timer.pomodoro, workMin: 50 } } } }))
    const c = ctl()
    c.start({ mode: 'pomodoro' })
    expect(timer()!.durationMs).toBe(50 * MIN)
    store.update((db) => ({ ...db, settings: { ...db.settings, timer: { ...db.settings.timer, pomodoro: { ...db.settings.timer.pomodoro, workMin: 10 } } } }))
    expect(timer()!.durationMs).toBe(50 * MIN)
  })

  it('preset mode uses the chosen preset', () => {
    ctl().start({ mode: 'preset', presetId: 'preset-90-20' })
    expect(timer()!.durationMs).toBe(90 * MIN)
  })

  it('skip moves from a break to ready work without logging', () => {
    const c = ctl()
    c.start({ mode: 'pomodoro' })
    clock += 25 * MIN
    c.tick()
    c.skip()
    expect(timer()).toMatchObject({ phase: 'work', status: 'paused' })
  })

  it('survives a reload: a new controller on the persisted state ends the phase', () => {
    const p = memory()
    store = createStore(p)
    ctl().start({ mode: 'pomodoro' })
    clock += 30 * MIN
    store = createStore(p) // "reload"
    const c2 = ctl()
    c2.tick()
    expect(ended).toEqual(['work'])
    expect(sessions()[0].end).toBeDefined()
  })
})
