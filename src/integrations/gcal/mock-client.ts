import type { CalendarInfo, GEvent, GEventInput, GoogleClient } from './types'
import { GcalApiError, GcalAuthError } from './types'

export interface MockCall {
  method: string
  args: unknown[]
}

export interface MockGoogle extends GoogleClient {
  calls: MockCall[]
  /** Calendars and events currently "on Google". */
  calendars: CalendarInfo[]
  events: Record<string, (GEvent & { input?: GEventInput })[]>
  /** Make the next `count` calls of `method` (or any method) throw. */
  failNext(error: Error, method?: string, count?: number): void
  expireToken(): void
  /** Allow the silent renewal to succeed or fail. */
  silentRenewal: boolean
}

/** In-memory Google for tests: records calls, stores events, can be told to fail. */
export function createMockClient(seed: { calendars?: CalendarInfo[]; events?: Record<string, GEvent[]> } = {}): MockGoogle {
  let token = false
  let seq = 0
  let failures: { method?: string; error: Error; count: number }[] = []
  const state: MockGoogle = {
    calls: [],
    calendars: seed.calendars ?? [{ id: 'primary', summary: 'Erez', primary: true }],
    events: Object.fromEntries(Object.entries(seed.events ?? {}).map(([k, v]) => [k, [...v]])),
    silentRenewal: true,
    failNext(error, method, count = 1) {
      failures.push({ method, error, count })
    },
    expireToken() {
      token = false
    },
    async requestToken({ interactive }) {
      state.calls.push({ method: 'requestToken', args: [interactive] })
      if (!interactive && !state.silentRenewal) throw new GcalAuthError()
      token = true
    },
    hasValidToken: () => token,
    async revoke() {
      state.calls.push({ method: 'revoke', args: [] })
      token = false
    },
    async listCalendars() {
      return call('listCalendars', [], () => [...state.calendars])
    },
    async listEvents(calendarId, timeMin, timeMax) {
      return call('listEvents', [calendarId, timeMin, timeMax], () =>
        (state.events[calendarId] ?? []).filter((e) => {
          const s = e.start?.dateTime ?? e.start?.date
          const en = e.end?.dateTime ?? e.end?.date
          return !!s && !!en && new Date(en) > new Date(timeMin) && new Date(s) < new Date(timeMax)
        }),
      )
    },
    async createCalendar(summary) {
      return call('createCalendar', [summary], () => {
        const c = { id: `cal-${++seq}`, summary }
        state.calendars.push(c)
        return c
      })
    },
    async createEvent(calendarId, event) {
      return call('createEvent', [calendarId, event], () => {
        const id = `ev-${++seq}`
        ;(state.events[calendarId] ??= []).push({ id, summary: event.summary, start: event.start, end: event.end, input: event })
        return { id }
      })
    },
    async updateEvent(calendarId, eventId, event) {
      return call('updateEvent', [calendarId, eventId, event], () => {
        const e = state.events[calendarId]?.find((x) => x.id === eventId)
        if (!e) throw new GcalApiError('Not Found', 404)
        Object.assign(e, { summary: event.summary, start: event.start, end: event.end, input: event })
      })
    },
    async deleteEvent(calendarId, eventId) {
      return call('deleteEvent', [calendarId, eventId], () => {
        const list = state.events[calendarId] ?? []
        const i = list.findIndex((x) => x.id === eventId)
        if (i < 0) throw new GcalApiError('Not Found', 404)
        list.splice(i, 1)
      })
    },
  }

  function call<T>(method: string, args: unknown[], fn: () => T): T {
    state.calls.push({ method, args })
    if (!token) throw new GcalAuthError()
    const f = failures.find((x) => (!x.method || x.method === method) && x.count > 0)
    if (f) {
      f.count--
      failures = failures.filter((x) => x.count > 0)
      throw f.error
    }
    return fn()
  }
  return state
}
