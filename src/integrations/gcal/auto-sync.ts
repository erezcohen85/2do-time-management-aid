import type { Store } from '@/data/store'
import type { DateStr } from '@/types'
import { calendarEvents } from './events-store'
import type { GcalService } from './service'
import type { StatusStore } from './status'

/** Everything that changes what the calendar should show for a day. */
function signature(store: Store, date: DateStr): string | null {
  const s = store.getState()
  const plan = s.plans[date]
  if (!plan?.pushed) return null
  const titles = plan.blocks.map((b) => s.items.find((i) => i.id === b.itemId)?.title ?? '')
  return JSON.stringify([
    plan.blocks.map((b) => [b.id, b.rank, b.estimateMin, b.pinnedStart, b.done, b.itemId]),
    titles,
    plan.orphanedEventIds,
    s.settings.dayStart,
    calendarEvents.get(date),
  ])
}

/**
 * Auto sync mode: after the first push of a day, later edits (move, reorder, remove, tick, retitle,
 * a calendar event appearing) are pushed after a short pause. Manual mode never runs this.
 * Returns a stop function.
 */
export function startAutoSync(deps: { store: Store; status: StatusStore; service: GcalService; debounceMs?: number }): () => void {
  const { store, status, service } = deps
  const delay = deps.debounceMs ?? 800
  const seen = new Map<DateStr, string | null>()
  const timers = new Map<DateStr, ReturnType<typeof setTimeout>>()

  const check = () => {
    const s = store.getState()
    if (s.settings.gcal.syncMode !== 'auto' || status.get().phase !== 'connected') return
    for (const date of Object.keys(s.plans)) {
      const sig = signature(store, date)
      if (!seen.has(date)) {
        seen.set(date, sig) // baseline: do not push just because we loaded or just pushed
        continue
      }
      if (sig === null || sig === seen.get(date)) {
        seen.set(date, sig)
        continue
      }
      seen.set(date, sig)
      clearTimeout(timers.get(date))
      timers.set(
        date,
        setTimeout(() => {
          timers.delete(date)
          void service.pushDay(date)
        }, delay),
      )
    }
  }

  check()
  const offStore = store.subscribe(check)
  const offEvents = calendarEvents.subscribe(check)
  const offStatus = status.subscribe(check)
  return () => {
    offStore()
    offEvents()
    offStatus()
    timers.forEach(clearTimeout)
    timers.clear()
  }
}
