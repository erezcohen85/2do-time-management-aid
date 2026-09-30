import { useSyncExternalStore } from 'react'
import type { CalendarEvent } from '@/domain/schedule'
import type { DateStr } from '@/types'

const EMPTY: CalendarEvent[] = []
let byDate: Record<DateStr, CalendarEvent[]> = {}
const listeners = new Set<() => void>()

/** Google Calendar events per day, filled by the gcal integration (Phase 7) and read by the timelines. */
export const calendarEvents = {
  set(date: DateStr, events: CalendarEvent[]) {
    byDate = { ...byDate, [date]: events }
    listeners.forEach((l) => l())
  },
  clear() {
    byDate = {}
    listeners.forEach((l) => l())
  },
  get: (date: DateStr): CalendarEvent[] => byDate[date] ?? EMPTY,
  subscribe(l: () => void) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
}

export function useCalendarEvents(date: DateStr): CalendarEvent[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => calendarEvents.get(date),
  )
}
