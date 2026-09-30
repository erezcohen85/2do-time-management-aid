import type { CalendarEvent } from '@/domain/schedule'
import { fromMin, parseDate } from '@/domain/time'
import type { DateStr } from '@/types'
import type { GEvent } from './types'

/** Local-time window for a day, as RFC 3339 strings for `events.list`. */
export function dayWindow(date: DateStr): { timeMin: string; timeMax: string } {
  const d = parseDate(date)
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0)
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0)
  return { timeMin: start.toISOString(), timeMax: end.toISOString() }
}

/**
 * Google events to fixed timeline blocks for one local day: timed, busy, not cancelled;
 * clamped to the day; sorted by start.
 */
export function toCalendarEvents(events: GEvent[], date: DateStr): CalendarEvent[] {
  const d = parseDate(date)
  const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const dayEnd = dayStart + 24 * 60 * 60 * 1000
  const out: CalendarEvent[] = []
  for (const e of events) {
    if (e.status === 'cancelled' || e.transparency === 'transparent') continue
    if (!e.start?.dateTime || !e.end?.dateTime) continue
    const s = new Date(e.start.dateTime).getTime()
    const en = new Date(e.end.dateTime).getTime()
    if (!(en > s) || en <= dayStart || s >= dayEnd) continue
    const startMin = Math.round((Math.max(s, dayStart) - dayStart) / 60000)
    const endMin = Math.round((Math.min(en, dayEnd) - dayStart) / 60000)
    if (endMin <= startMin) continue
    out.push({ id: e.id, title: e.summary?.trim() || '(no title)', start: fromMin(startMin), end: fromMin(endMin) })
  }
  return out.sort((a, b) => a.start.localeCompare(b.start))
}
