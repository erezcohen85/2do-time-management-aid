import type { DateStr, TimeStr } from '@/types'

export function toMin(t: TimeStr): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function fromMin(min: number): TimeStr {
  const m = Math.max(0, Math.round(min))
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** Noon local time avoids DST edge cases when doing date arithmetic. */
export function parseDate(d: DateStr): Date {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day, 12)
}

export function formatDate(d: Date): DateStr {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function addDays(d: DateStr, n: number): DateStr {
  const x = parseDate(d)
  x.setDate(x.getDate() + n)
  return formatDate(x)
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(d: DateStr): number {
  return parseDate(d).getDay()
}

export function todayStr(now: Date = new Date()): DateStr {
  return formatDate(now)
}

export function minutesOfDay(now: Date): number {
  return now.getHours() * 60 + now.getMinutes()
}
