import {
  format,
  isToday,
  isTomorrow,
  isPast,
  isThisYear,
  parseISO,
  startOfDay,
  differenceInCalendarDays,
} from 'date-fns'

export function parseDate(value?: string | null): Date | null {
  if (!value) return null
  try {
    const d = value.length <= 10 ? parseISO(value + 'T00:00:00') : parseISO(value)
    return isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}

export type DueState = 'overdue' | 'today' | 'tomorrow' | 'upcoming' | 'none'

export function dueState(value?: string | null): DueState {
  const d = parseDate(value)
  if (!d) return 'none'
  if (isToday(d)) return 'today'
  if (isPast(startOfDay(d))) return 'overdue'
  if (isTomorrow(d)) return 'tomorrow'
  return 'upcoming'
}

export function formatDue(value?: string | null): string {
  const d = parseDate(value)
  if (!d) return ''
  if (isToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  const days = differenceInCalendarDays(d, new Date())
  if (days < 0 && days >= -7) return `${Math.abs(days)}d overdue`
  if (days > 0 && days <= 6) return format(d, 'EEEE')
  return format(d, isThisYear(d) ? 'MMM d' : 'MMM d, yyyy')
}

export function toDateInputValue(value?: string | null): string {
  const d = parseDate(value)
  return d ? format(d, 'yyyy-MM-dd') : ''
}

export const DUE_STATE_CLASS: Record<DueState, string> = {
  overdue: 'text-danger',
  today: 'text-accent',
  tomorrow: 'text-ink-soft',
  upcoming: 'text-ink-faint',
  none: 'text-ink-faint',
}
