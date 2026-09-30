import { useEffect } from 'react'
import { actions, newId } from '@/data/actions'
import { useDb } from '@/data/hooks'
import { todayStr } from '@/domain/time'
import type { DateStr } from '@/types'

/**
 * Auto-inserts the weekly review block at rank #1 when `date` is the review day.
 * Only for today and future days, so browsing old weeks never changes them.
 * Safe to call repeatedly: the mutation inserts once per week.
 */
export function useReviewBlock(date: DateStr) {
  const weekday = useDb((db) => db.settings.review.weekday)
  const locked = useDb((db) => db.plans[date]?.locked ?? false)
  useEffect(() => {
    if (date < todayStr() || locked) return
    actions.ensureReviewBlock(date, newId())
  }, [date, weekday, locked])
}
