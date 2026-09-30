import { emptyDb } from '@/data/defaults'
import * as m from '@/data/mutations'
import type { Persistence } from '@/data/persistence'
import { createStore, type Store } from '@/data/store'
import type { Db } from '@/types'
import { startAutoSync } from './auto-sync'
import { calendarEvents } from './events-store'
import { createMockClient, type MockGoogle } from './mock-client'
import { createGcalService } from './service'
import { createStatusStore } from './status'

const D = '2026-10-01'
const memory = (): Persistence => {
  let db: Db = emptyDb()
  return { load: () => db, save: (d) => { db = d } }
}
const mem = () => {
  const d: Record<string, string> = {}
  return { getItem: (k: string) => d[k] ?? null, setItem: (k: string, v: string) => void (d[k] = v), removeItem: (k: string) => void delete d[k] }
}

let store: Store, google: MockGoogle, stop: () => void
const writes = () => google.calls.filter((c) => ['createEvent', 'updateEvent', 'deleteEvent'].includes(c.method)).length

async function setup(syncMode: 'auto' | 'manual' = 'auto') {
  calendarEvents.clear()
  store = createStore(memory())
  google = createMockClient()
  const status = createStatusStore()
  const service = createGcalService({ store, getClient: () => google, status, storage: mem() })
  store.update((d) => m.updateSettings(d, { gcal: { syncMode } }))
  for (const [i, t] of ['A', 'B'].entries()) {
    store.update((d) => m.addItem(d, m.makeItem({ id: `i${i}`, title: t })))
    store.update((d) => m.addItemBlock(d, D, `i${i}`, { id: `b${i}`, estimateMin: 30 }))
  }
  await service.connect()
  await service.pushDay(D) // first push is manual
  stop = startAutoSync({ store, status, service, debounceMs: 50 })
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  stop?.()
  vi.useRealTimers()
})

describe('auto sync', () => {
  it('does not push on start, even though a pushed plan exists', async () => {
    await setup()
    const before = writes()
    await vi.advanceTimersByTimeAsync(500)
    expect(writes()).toBe(before)
  })

  it('pushes after edits to a pushed day (debounced into one push)', async () => {
    await setup()
    const before = writes()
    store.update((d) => m.setBlockDone(d, D, 'b0', true))
    store.update((d) => m.moveBlock(d, D, 'b1', 0))
    expect(writes()).toBe(before)
    await vi.advanceTimersByTimeAsync(200)
    const cal = store.getState().settings.gcal.targetCalendarId!
    expect(google.events[cal].map((e) => e.summary).sort()).toEqual(['1. B', '✔ 2. A'])
  })

  it('removal deletes the event', async () => {
    await setup()
    store.update((d) => m.removeBlock(d, D, 'b0'))
    await vi.advanceTimersByTimeAsync(200)
    const cal = store.getState().settings.gcal.targetCalendarId!
    expect(google.events[cal]).toHaveLength(1)
  })

  it('a newly appearing calendar event re-stacks and updates the pushed times', async () => {
    await setup()
    calendarEvents.set(D, [{ id: 'e', title: 'Standup', start: '08:30', end: '09:30' }])
    await vi.advanceTimersByTimeAsync(200)
    const cal = store.getState().settings.gcal.targetCalendarId!
    expect(google.events[cal][0].start?.dateTime).toBe(new Date(`${D}T09:30:00`).toISOString())
  })

  it('manual mode never syncs by itself', async () => {
    await setup('manual')
    const before = writes()
    store.update((d) => m.setBlockDone(d, D, 'b0', true))
    await vi.advanceTimersByTimeAsync(500)
    expect(writes()).toBe(before)
  })

  it('ignores days that were never pushed', async () => {
    await setup()
    store.update((d) => m.addItemBlock(d, '2026-10-05', 'i0', { id: 'x', estimateMin: 30 }))
    const before = writes()
    await vi.advanceTimersByTimeAsync(500)
    expect(writes()).toBe(before)
  })
})
