import type { DateStr } from '@/types'
import { addDays, formatDate, parseDate, weekdayOf } from './time'

/** First date of the week containing `d`, for a week that starts on weekday `weekStart`. */
export function weekStartOf(d: DateStr, weekStart: number): DateStr {
  const back = (weekdayOf(d) - weekStart + 7) % 7
  return addDays(d, -back)
}

export function weekDates(weekStartDate: DateStr): DateStr[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i))
}

export function flipWeek(weekStartDate: DateStr, n: number): DateStr {
  return addDays(weekStartDate, n * 7)
}

/** Dates of the week whose weekday is in `visibleDays`, in calendar order. */
export function visibleDates(weekStartDate: DateStr, visibleDays: number[]): DateStr[] {
  return weekDates(weekStartDate).filter((d) => visibleDays.includes(weekdayOf(d)))
}

/** ISO week number of the week's middle day (so Sunday-start weeks label naturally). */
export function isoWeekNumber(weekStartDate: DateStr): number {
  const mid = parseDate(addDays(weekStartDate, 3))
  const t = new Date(Date.UTC(mid.getFullYear(), mid.getMonth(), mid.getDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

/** Weekday indexes (0=Sun) sorted in display order for a week starting on `weekStart`. */
export function orderDays(days: number[], weekStart: number): number[] {
  return [...new Set(days)].sort((a, b) => ((a - weekStart + 7) % 7) - ((b - weekStart + 7) % 7))
}

/**
 * The day Plan & Review opens on. Evening ritual past its time, or a day that is
 * already over for planning, lands on tomorrow; otherwise today.
 */
export function defaultPlanDate(
  now: Date,
  ritual: { mode: 'evening' | 'morning' | 'anytime'; time: string },
): DateStr {
  const today = formatDate(now)
  if (ritual.mode !== 'evening') return today
  const [h, m] = ritual.time.split(':').map(Number)
  const past = now.getHours() * 60 + now.getMinutes() >= h * 60 + m
  return past ? addDays(today, 1) : today
}
