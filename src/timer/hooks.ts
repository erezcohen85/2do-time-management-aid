import { useEffect, useState } from 'react'
import { useDb } from '@/data/hooks'
import { browserAlerter } from './alerts'
import { getTimerController } from './controller'
import type { TimerState } from './engine'

export const timerController = () => getTimerController(browserAlerter)

export function useTimerState(): TimerState | null {
  return useDb((db) => db.timer)
}

/** Re-renders every `ms` with the current epoch time. */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms)
    return () => window.clearInterval(id)
  }, [ms])
  return now
}

/** Mount once: ends phases on time (also right after a reload) and fires alerts. */
export function useTimerTicker() {
  useEffect(() => {
    const ctl = timerController()
    ctl.tick()
    const id = window.setInterval(() => ctl.tick(), 500)
    return () => window.clearInterval(id)
  }, [])
}
