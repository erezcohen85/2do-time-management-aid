import type { DateStr, DayPlan, Settings, WeeklyReview } from '@/types'
import { addDays, formatDate, toMin } from './time'
import { isReviewDay } from './review'
import { weekStartOf } from './week'

/**
 * Is the planning reminder due? Evening ritual plans tomorrow, morning ritual plans today.
 * Not due before the reminder time, when the target day already has blocks, or once handled today.
 */
export function ritualDue(
  now: Date,
  settings: Settings,
  plans: Record<DateStr, DayPlan>,
  handledDate?: DateStr,
): { due: boolean; target: DateStr } {
  const today = formatDate(now)
  const target = settings.ritual.mode === 'evening' ? addDays(today, 1) : today
  const { mode, time, reminder } = settings.ritual
  if (mode === 'anytime' || !reminder) return { due: false, target }
  if (now.getHours() * 60 + now.getMinutes() < toMin(time)) return { due: false, target }
  if (handledDate === today) return { due: false, target }
  if ((plans[target]?.blocks.length ?? 0) > 0) return { due: false, target }
  return { due: true, target }
}

/** Today is the review day and this week's review is not completed yet. */
export function reviewIsDue(now: Date, settings: Settings, reviews: Record<DateStr, WeeklyReview>): boolean {
  const today = formatDate(now)
  if (!isReviewDay(today, settings)) return false
  return !reviews[weekStartOf(today, settings.weekStart)]?.completedAt
}
