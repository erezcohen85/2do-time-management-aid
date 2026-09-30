import { store } from '@/data/store'
import { gcalStatus } from './status'
import { createRealClient } from './real-client'
import { createGcalService, type GcalService } from './service'
import type { GoogleClient } from './types'

declare global {
  interface Window {
    /** Test hook: install a fake client before the app loads. */
    __2DO_GCAL_CLIENT__?: GoogleClient
  }
}

export const googleClientId = (): string => (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() ?? ''

let real: GoogleClient | null = null

/** The injected test client, else the real client when a client id is configured, else null. */
export function getGoogleClient(): GoogleClient | null {
  if (typeof window !== 'undefined' && window.__2DO_GCAL_CLIENT__) return window.__2DO_GCAL_CLIENT__
  const id = googleClientId()
  if (!id) return null
  real ??= createRealClient({ clientId: id })
  return real
}

let service: GcalService | null = null

/** App-wide service bound to the real store and status. */
export function gcal(): GcalService {
  service ??= createGcalService({ store, getClient: getGoogleClient, status: gcalStatus })
  return service
}

/** For tests: forget the singleton and the cached real client. */
export function resetGcalForTests() {
  service = null
  real = null
  gcalStatus.reset()
}
