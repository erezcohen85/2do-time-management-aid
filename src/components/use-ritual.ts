import { useDb } from '@/data/hooks'
import { ritualDue } from '@/domain/ritual'
import { useRitualHandled } from '@/lib/ritual-state'
import { useNow } from '@/timer/hooks'

/** Current state of the planning reminder, re-evaluated every 30 seconds. */
export function useRitual() {
  const now = useNow(30000)
  const settings = useDb((db) => db.settings)
  const plans = useDb((db) => db.plans)
  const handled = useRitualHandled()
  return { now: new Date(now), ...ritualDue(new Date(now), settings, plans, handled) }
}
