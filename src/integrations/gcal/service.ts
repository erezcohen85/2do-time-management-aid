import { bindActions } from '@/data/actions'
import type { Store } from '@/data/store'
import { schedule } from '@/domain/schedule'
import type { Block, DateStr } from '@/types'
import { calendarEvents } from './events-store'
import { dayWindow, toCalendarEvents } from './events'
import type { StatusStore } from './status'
import { desiredEvents, planSync } from './sync'
import { GcalApiError, GcalAuthError, TARGET_CALENDAR_NAME, type CalendarInfo, type GoogleClient } from './types'

const LINKED_KEY = '2do.gcal.linked'

export interface ServiceDeps {
  store: Store
  getClient: () => GoogleClient | null
  status: StatusStore
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
}

export interface PushResult {
  created: number
  updated: number
  deleted: number
}

export function createGcalService(deps: ServiceDeps) {
  const { store, getClient, status } = deps
  const actions = bindActions(store)
  const storage = deps.storage ?? localStorage
  let lastFailed: (() => Promise<unknown>) | null = null

  const linked = () => {
    try {
      return storage.getItem(LINKED_KEY) === '1'
    } catch {
      return false
    }
  }
  const setLinked = (v: boolean) => {
    try {
      if (v) storage.setItem(LINKED_KEY, '1')
      else storage.removeItem(LINKED_KEY)
    } catch {
      // storage unavailable: user will reconnect next load
    }
  }

  function fail(e: unknown, retry: () => Promise<unknown>) {
    lastFailed = retry
    if (e instanceof GcalAuthError) {
      status.set({ phase: 'reconnect', syncing: false, error: { message: e.message, action: 'reconnect' } })
    } else {
      const message = e instanceof Error ? e.message : String(e)
      status.set({ syncing: false, error: { message, action: 'retry' } })
    }
  }

  /** Runs `fn` with a valid token. Errors become a banner state instead of throwing. */
  async function run<T>(op: () => Promise<T>, fn: (c: GoogleClient) => Promise<T>): Promise<T | undefined> {
    const client = getClient()
    if (!client) return undefined
    try {
      if (!client.hasValidToken()) await client.requestToken({ interactive: false })
      const r = await fn(client)
      lastFailed = null
      if (status.get().error) status.set({ error: null })
      return r
    } catch (e) {
      fail(e, op)
      return undefined
    }
  }

  const service = {
    /** Decide the starting state on app load. Never opens a popup. */
    async init() {
      const client = getClient()
      if (!client) return status.set({ phase: 'unconfigured' })
      if (!linked()) return status.set({ phase: 'disconnected' })
      if (client.hasValidToken()) return status.set({ phase: 'connected' })
      try {
        await client.requestToken({ interactive: false })
        status.set({ phase: 'connected', error: null })
      } catch {
        status.set({ phase: 'reconnect', error: null })
      }
    },

    /** Interactive sign-in (must be called from a click). */
    async connect() {
      const client = getClient()
      if (!client) return status.set({ phase: 'unconfigured' })
      status.set({ phase: 'connecting', error: null })
      try {
        await client.requestToken({ interactive: true })
        setLinked(true)
        status.set({ phase: 'connected', error: null })
        await service.loadCalendars()
        const gcal = store.getState().settings.gcal
        if (gcal.readCalendarIds.length === 0) {
          const primary = status.get().calendars.find((c) => c.primary)
          if (primary) actions.updateSettings({ gcal: { readCalendarIds: [primary.id] } })
        }
      } catch (e) {
        status.set({ phase: linked() ? 'reconnect' : 'disconnected' })
        fail(e, () => service.connect())
      }
    },

    async disconnect() {
      try {
        await getClient()?.revoke()
      } catch {
        // revoking is best effort
      }
      setLinked(false)
      calendarEvents.clear()
      status.reset()
      status.set({ phase: getClient() ? 'disconnected' : 'unconfigured' })
    },

    async loadCalendars(): Promise<CalendarInfo[]> {
      const list = await run(() => service.loadCalendars(), (c) => c.listCalendars())
      if (list) status.set({ calendars: list })
      return list ?? []
    },

    /** Fetch events of the chosen calendars for these days onto the timelines. */
    async refreshEvents(dates: DateStr[]) {
      const { gcal } = store.getState().settings
      const ids = gcal.readCalendarIds.filter((id) => id !== gcal.targetCalendarId)
      if (status.get().phase !== 'connected' && status.get().phase !== 'reconnect') return
      await run(
        () => service.refreshEvents(dates),
        async (c) => {
          for (const date of dates) {
            const { timeMin, timeMax } = dayWindow(date)
            const all = (await Promise.all(ids.map((id) => c.listEvents(id, timeMin, timeMax)))).flat()
            calendarEvents.set(date, toCalendarEvents(all, date))
          }
        },
      )
    },

    /** Create the "2DO" calendar if needed and sync this day's blocks. */
    async pushDay(date: DateStr): Promise<PushResult | undefined> {
      const plan0 = store.getState().plans[date]
      if (!plan0) return undefined
      status.set({ syncing: true })
      const result = await run(
        () => service.pushDay(date),
        async (c) => {
          const target = await ensureTargetCalendar(c)
          const s = store.getState()
          const plan = s.plans[date]
          const out: PushResult = { created: 0, updated: 0, deleted: 0 }
          if (!plan) return out
          const titleOf = (b: Block) =>
            b.kind === 'review' ? 'Weekly review' : (s.items.find((i) => i.id === b.itemId)?.title ?? '…')
          const res = schedule(plan.blocks, calendarEvents.get(date), { dayStart: s.settings.dayStart, overflowAfter: s.settings.overflowAfter })
          const ops = planSync(desiredEvents(date, res.blocks, plan.blocks, titleOf), plan.blocks, plan.orphanedEventIds ?? [])
          for (const op of ops) {
            if (op.type === 'create') {
              const { id } = await c.createEvent(target, op.input)
              actions.setBlockSync(date, op.blockId, { gcalEventId: id, gcalSig: op.sig })
              out.created++
            } else if (op.type === 'update') {
              try {
                await c.updateEvent(target, op.eventId, op.input)
                actions.setBlockSync(date, op.blockId, { gcalEventId: op.eventId, gcalSig: op.sig })
                out.updated++
              } catch (e) {
                if (!(e instanceof GcalApiError) || (e.status !== 404 && e.status !== 410)) throw e
                // the event was deleted in Google: put it back
                const { id } = await c.createEvent(target, op.input)
                actions.setBlockSync(date, op.blockId, { gcalEventId: id, gcalSig: op.sig })
                out.created++
              }
            } else {
              try {
                await c.deleteEvent(target, op.eventId)
              } catch (e) {
                if (!(e instanceof GcalApiError) || (e.status !== 404 && e.status !== 410)) throw e
              }
              actions.clearOrphans(date, [op.eventId])
              out.deleted++
            }
          }
          actions.setPushed(date, true)
          return out
        },
      )
      status.set({ syncing: false, ...(result ? { lastSyncAt: Date.now() } : {}) })
      return result
    },

    /** Retry whatever failed last (banner "Retry"). */
    async retry() {
      const op = lastFailed
      status.set({ error: null })
      if (op) await op()
    },

    /** Reconnect after the token could not be renewed (banner "Reconnect"). */
    reconnect: () => service.connect(),
  }

  async function ensureTargetCalendar(c: GoogleClient): Promise<string> {
    const { gcal } = store.getState().settings
    const calendars = await c.listCalendars()
    status.set({ calendars })
    const existing =
      calendars.find((x) => x.id === gcal.targetCalendarId) ?? calendars.find((x) => x.summary === TARGET_CALENDAR_NAME && x.accessRole !== 'reader')
    if (existing) {
      if (existing.id !== gcal.targetCalendarId) actions.updateSettings({ gcal: { targetCalendarId: existing.id } })
      return existing.id
    }
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const created = await c.createCalendar(TARGET_CALENDAR_NAME, tz)
    actions.updateSettings({ gcal: { targetCalendarId: created.id } })
    return created.id
  }

  return service
}

export type GcalService = ReturnType<typeof createGcalService>
