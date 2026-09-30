import type { Block, DateStr, DayPlan, Grade, Item, Project, Settings, TimerSession } from '@/types'
import { GRADES } from '@/types'
import { addDays, formatDate, weekdayOf } from './time'
import { visibleDates } from './week'
import { score } from './plan'

export function isReviewDay(date: DateStr, settings: Settings): boolean {
  return weekdayOf(date) === settings.review.weekday
}

/**
 * Returns a copy of `plan` with the weekly review block at rank 1 (others shift down),
 * or null when `plan` is not on the review day or already has a review block.
 */
export function insertReviewBlock(plan: DayPlan, settings: Settings, opts: { id: string }): DayPlan | null {
  if (!isReviewDay(plan.date, settings)) return null
  if (plan.blocks.some((b) => b.kind === 'review')) return null
  const review: Block = {
    id: opts.id,
    kind: 'review',
    rank: 1,
    estimateMin: settings.review.estimateMin,
    pinnedStart: settings.review.time,
    done: false,
  }
  const shifted = plan.blocks.map((b) => ({ ...b, rank: b.rank + 1 }))
  return { ...plan, blocks: [review, ...shifted] }
}

export interface Scorecard {
  days: { date: DateStr; done: number; total: number }[]
  fullDays: number
  doneByGrade: Record<Grade, number>
  taggedMin: number
  untaggedMin: number
}

export function scorecard(
  weekStartDate: DateStr,
  visibleDays: number[],
  plans: Record<DateStr, DayPlan>,
  items: Item[],
  sessions: TimerSession[],
): Scorecard {
  const dates = visibleDates(weekStartDate, visibleDays)
  const days = dates.map((date) => ({ date, ...score(plans[date]) }))
  const inWeek = (iso: string) => {
    const d = formatDate(new Date(iso))
    return d >= weekStartDate && d <= addDays(weekStartDate, 6)
  }
  const doneByGrade = Object.fromEntries(GRADES.map((g) => [g, 0])) as Record<Grade, number>
  for (const it of items) {
    if (it.done && it.doneAt && it.grade && inWeek(it.doneAt)) doneByGrade[it.grade]++
  }
  let taggedMin = 0
  let untaggedMin = 0
  for (const s of sessions) {
    if (!s.end || !inWeek(s.start)) continue
    const min = Math.round((new Date(s.end).getTime() - new Date(s.start).getTime()) / 60000)
    if (s.itemId) taggedMin += min
    else untaggedMin += min
  }
  return {
    days,
    fullDays: days.filter((d) => d.total > 0 && d.done === d.total).length,
    doneByGrade,
    taggedMin,
    untaggedMin,
  }
}

/** Non-archived projects that still have open items. */
export function activeProjectsForReview(projects: Project[], items: Item[]): Project[] {
  return projects
    .filter((p) => !p.archived && items.some((i) => i.projectId === p.id && !i.done))
    .sort((a, b) => a.order - b.order)
}

/** The date of the weekly review inside the week that starts on `weekStartDate`. */
export function reviewDateOfWeek(weekStartDate: DateStr, settings: Settings): DateStr {
  return addDays(weekStartDate, (settings.review.weekday - weekdayOf(weekStartDate) + 7) % 7)
}
