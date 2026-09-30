import { useEffect } from 'react'
import { useDb } from '@/data/hooks'
import { store } from '@/data/store'
import type { DateStr } from '@/types'
import { startAutoSync } from './auto-sync'
import { gcal } from './client'
import { gcalStatus, useGcalStatus } from './status'

/** Mount once: decides the starting connection state and runs auto sync. */
export function useGcalLifecycle() {
  useEffect(() => {
    void gcal().init()
    return startAutoSync({ store, status: gcalStatus, service: gcal() })
  }, [])
}

/** Keep calendar events for these days fresh on the timelines (every 5 minutes while visible). */
export function useGcalEvents(dates: DateStr[]) {
  const { phase } = useGcalStatus()
  const readIds = useDb((db) => db.settings.gcal.readCalendarIds)
  const key = dates.join(',')
  const readKey = readIds.join(',')
  useEffect(() => {
    if (phase !== 'connected') return
    const list = key ? key.split(',') : []
    void gcal().refreshEvents(list)
    const id = window.setInterval(() => void gcal().refreshEvents(list), 5 * 60 * 1000)
    return () => window.clearInterval(id)
  }, [phase, key, readKey])
}
