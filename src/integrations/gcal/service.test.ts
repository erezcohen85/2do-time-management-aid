import { emptyDb } from '@/data/defaults'
import * as m from '@/data/mutations'
import type { Persistence } from '@/data/persistence'
import { createStore, type Store } from '@/data/store'
import type { Db } from '@/types'
import { calendarEvents } from './events-store'
import { createMockClient, type MockGoogle } from './mock-client'
import { createGcalService, type GcalService } from './service'
import { createStatusStore, type StatusStore } from './status'
import { GcalApiError } from './types'

const D = '2026-10-01'
const memory = (): Persistence => {
  let db: Db = emptyDb()
  return { load: () => db, save: (d) => { db = d } }
}
const mem = () => {
  const data: Record<string, string> = {}
  return { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v), removeItem: (k: string) => void delete data[k] }
}

let store: Store, google: MockGoogle, status: StatusStore, svc: GcalService
const db = () => store.getState()
const calls = (method: string) => google.calls.filter((c) => c.method === method)

function plan(...titles: string[]) {
  titles.forEach((t, i) => {
    store.update((d) => m.addItem(d, m.makeItem({ id: `i${i}`, title: t })))
    store.update((d) => m.addItemBlock(d, D, `i${i}`, { id: `b${i}`, estimateMin: 30 }))
  })
}

beforeEach(() => {
  calendarEvents.clear()
  store = createStore(memory())
  google = createMockClient({ calendars: [{ id: 'primary', summary: 'Erez', primary: true }, { id: 'work', summary: 'Work' }] })
  status = createStatusStore()
  svc = createGcalService({ store, getClient: () => google, status, storage: mem() })
})

describe('init and connect', () => {
  it('no client -> unconfigured', async () => {
    svc = createGcalService({ store, getClient: () => null, status, storage: mem() })
    await svc.init()
    expect(status.get().phase).toBe('unconfigured')
  })
  it('never linked -> disconnected, without touching Google', async () => {
    await svc.init()
    expect(status.get().phase).toBe('disconnected')
    expect(google.calls).toEqual([])
  })
  it('connect signs in interactively, lists calendars and reads the primary one by default', async () => {
    await svc.connect()
    expect(google.calls[0]).toEqual({ method: 'requestToken', args: [true] })
    expect(status.get()).toMatchObject({ phase: 'connected', error: null })
    expect(status.get().calendars.map((c) => c.id)).toEqual(['primary', 'work'])
    expect(db().settings.gcal.readCalendarIds).toEqual(['primary'])
  })
  it('a linked user with an expired token renews silently on init', async () => {
    const storage = mem()
    svc = createGcalService({ store, getClient: () => google, status, storage })
    await svc.connect()
    google.expireToken()
    const svc2 = createGcalService({ store, getClient: () => google, status: createStatusStore(), storage })
    await svc2.init()
    expect(google.calls.filter((c) => c.method === 'requestToken').map((c) => c.args[0])).toEqual([true, false])
  })
  it('falls back to reconnect when silent renewal fails', async () => {
    const storage = mem()
    svc = createGcalService({ store, getClient: () => google, status, storage })
    await svc.connect()
    google.expireToken()
    google.silentRenewal = false
    await svc.init()
    expect(status.get().phase).toBe('reconnect')
  })
  it('disconnect revokes and resets', async () => {
    await svc.connect()
    calendarEvents.set(D, [{ id: 'e', title: 'x', start: '09:00', end: '10:00' }])
    await svc.disconnect()
    expect(calls('revoke')).toHaveLength(1)
    expect(status.get().phase).toBe('disconnected')
    expect(calendarEvents.get(D)).toEqual([])
  })
})

describe('reading events', () => {
  it('puts busy timed events of the chosen calendars onto the day, skipping the 2DO calendar', async () => {
    const at = (hm: string) => new Date(`${D}T${hm}:00`).toISOString()
    google = createMockClient({
      calendars: [{ id: 'primary', summary: 'Erez', primary: true }, { id: 'work', summary: 'Work' }],
      events: {
        primary: [{ id: 'p1', summary: 'Dentist', start: { dateTime: at('10:00') }, end: { dateTime: at('11:00') } }],
        work: [{ id: 'w1', summary: 'Standup', start: { dateTime: at('09:00') }, end: { dateTime: at('09:15') } }],
        target: [{ id: 't1', summary: '1. mine', start: { dateTime: at('08:30') }, end: { dateTime: at('09:00') } }],
      },
    })
    svc = createGcalService({ store, getClient: () => google, status, storage: mem() })
    await svc.connect()
    store.update((d) => m.updateSettings(d, { gcal: { readCalendarIds: ['primary', 'work', 'target'], targetCalendarId: 'target' } }))
    await svc.refreshEvents([D])
    expect(calendarEvents.get(D).map((e) => e.title)).toEqual(['Standup', 'Dentist'])
  })
  it('does nothing while disconnected', async () => {
    await svc.refreshEvents([D])
    expect(google.calls).toEqual([])
  })
})

describe('push', () => {
  it('first push creates the 2DO calendar and one event per block, storing ids', async () => {
    plan('Landing copy', 'Call accountant')
    await svc.connect()
    const r = await svc.pushDay(D)
    expect(r).toEqual({ created: 2, updated: 0, deleted: 0 })
    expect(calls('createCalendar')).toHaveLength(1)
    const calId = db().settings.gcal.targetCalendarId!
    expect(google.calendars.find((c) => c.id === calId)!.summary).toBe('2DO')
    expect(google.events[calId].map((e) => e.summary)).toEqual(['1. Landing copy', '2. Call accountant'])
    expect(db().plans[D].blocks.every((b) => b.gcalEventId && b.gcalSig)).toBe(true)
    expect(db().plans[D].pushed).toBe(true)
  })
  it('reuses an existing 2DO calendar instead of creating another', async () => {
    google.calendars.push({ id: 'old2do', summary: '2DO' })
    plan('A')
    await svc.connect()
    await svc.pushDay(D)
    expect(calls('createCalendar')).toHaveLength(0)
    expect(db().settings.gcal.targetCalendarId).toBe('old2do')
  })
  it('a second push with no changes makes no writes', async () => {
    plan('A', 'B')
    await svc.connect()
    await svc.pushDay(D)
    const writes = () => google.calls.filter((c) => ['createEvent', 'updateEvent', 'deleteEvent'].includes(c.method)).length
    const before = writes()
    const r = await svc.pushDay(D)
    expect(r).toEqual({ created: 0, updated: 0, deleted: 0 })
    expect(writes()).toBe(before)
  })
  it('reorder updates titles and times; removal deletes the event; done adds ✔', async () => {
    plan('A', 'B', 'C')
    await svc.connect()
    await svc.pushDay(D)
    const cal = db().settings.gcal.targetCalendarId!
    store.update((d) => m.moveBlock(d, D, 'b2', 0))
    store.update((d) => m.removeBlock(d, D, 'b1'))
    store.update((d) => m.setBlockDone(d, D, 'b0', true))
    const r = await svc.pushDay(D)
    expect(r).toEqual({ created: 0, updated: 2, deleted: 1 })
    expect(google.events[cal].map((e) => e.summary).sort()).toEqual(['1. C', '✔ 2. A'].sort())
    expect(db().plans[D].orphanedEventIds).toBeUndefined()
  })
  it('an event deleted in Google is recreated on the next change', async () => {
    plan('A')
    await svc.connect()
    await svc.pushDay(D)
    const cal = db().settings.gcal.targetCalendarId!
    google.events[cal].length = 0
    store.update((d) => m.setBlockDone(d, D, 'b0', true))
    const r = await svc.pushDay(D)
    expect(r).toEqual({ created: 1, updated: 0, deleted: 0 })
    expect(google.events[cal][0].summary).toBe('✔ 1. A')
  })
  it('flows unpinned blocks around calendar events, like the timeline does', async () => {
    plan('A')
    calendarEvents.set(D, [{ id: 'e', title: 'Standup', start: '08:30', end: '09:00' }])
    await svc.connect()
    await svc.pushDay(D)
    const cal = db().settings.gcal.targetCalendarId!
    expect(google.events[cal][0].start?.dateTime).toBe(new Date(`${D}T09:00:00`).toISOString())
  })
  it('works on locked days', async () => {
    plan('A')
    store.update((d) => m.setLocked(d, D, true))
    await svc.connect()
    expect(await svc.pushDay(D)).toEqual({ created: 1, updated: 0, deleted: 0 })
  })
  it('nothing to push without a plan', async () => {
    await svc.connect()
    expect(await svc.pushDay(D)).toBeUndefined()
  })
})

describe('failures', () => {
  it('a failed push shows a retryable error and the local plan is untouched; retry succeeds', async () => {
    plan('A')
    await svc.connect()
    google.failNext(new GcalApiError('Rate limit', 429), 'createEvent')
    expect(await svc.pushDay(D)).toBeUndefined()
    expect(status.get().error).toEqual({ message: 'Rate limit', action: 'retry' })
    expect(status.get().syncing).toBe(false)
    expect(db().plans[D].blocks[0].gcalEventId).toBeUndefined()
    await svc.retry()
    expect(status.get().error).toBeNull()
    expect(db().plans[D].blocks[0].gcalEventId).toBeDefined()
  })
  it('an expired token that cannot be renewed asks to reconnect', async () => {
    plan('A')
    await svc.connect()
    google.expireToken()
    google.silentRenewal = false
    await svc.pushDay(D)
    expect(status.get()).toMatchObject({ phase: 'reconnect', error: { action: 'reconnect' } })
    await svc.reconnect()
    expect(status.get()).toMatchObject({ phase: 'connected', error: null })
  })
  it('an expired token that renews silently just works', async () => {
    plan('A')
    await svc.connect()
    google.expireToken()
    expect(await svc.pushDay(D)).toEqual({ created: 1, updated: 0, deleted: 0 })
  })
})
