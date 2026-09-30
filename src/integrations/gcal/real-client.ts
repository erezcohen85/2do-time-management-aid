import type { CalendarInfo, GEvent, GEventInput, GoogleClient } from './types'
import { GCAL_SCOPES, GcalApiError, GcalAuthError } from './types'

const API = 'https://www.googleapis.com/calendar/v3'
const TOKEN_KEY = '2do.gcal.token'

interface TokenResponse {
  access_token?: string
  expires_in?: number | string
  error?: string
}

interface TokenClient {
  requestAccessToken(overrides?: { prompt?: string }): void
}

/** Minimal shape of Google Identity Services that we use. */
export interface GisApi {
  accounts: {
    oauth2: {
      initTokenClient(cfg: {
        client_id: string
        scope: string
        callback: (r: TokenResponse) => void
        error_callback?: (e: { type?: string; message?: string }) => void
      }): TokenClient
      revoke(token: string, done?: () => void): void
    }
  }
}

declare global {
  interface Window {
    google?: GisApi
  }
}

export function loadGis(doc: Document = document): Promise<GisApi> {
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google)
  return new Promise((resolve, reject) => {
    const s = doc.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => (window.google?.accounts?.oauth2 ? resolve(window.google) : reject(new Error('Google sign-in failed to load')))
    s.onerror = () => reject(new Error('Could not load Google sign-in. Check your connection.'))
    doc.head.appendChild(s)
  })
}

export interface RealClientOptions {
  clientId: string
  fetch?: typeof fetch
  loadGis?: () => Promise<GisApi>
  now?: () => number
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
}

/** Google Identity Services token client + Calendar REST, all in the browser. */
export function createRealClient(o: RealClientOptions): GoogleClient {
  const doFetch = o.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a))
  const gis = o.loadGis ?? (() => loadGis())
  const now = o.now ?? (() => Date.now())
  const storage = o.storage ?? sessionStorage

  let token: { value: string; expiresAt: number } | null = (() => {
    try {
      const raw = storage.getItem(TOKEN_KEY)
      const t = raw ? (JSON.parse(raw) as { value: string; expiresAt: number }) : null
      return t && t.expiresAt > now() ? t : null
    } catch {
      return null
    }
  })()

  const valid = () => !!token && token.expiresAt - 30_000 > now()

  function save(t: typeof token) {
    token = t
    try {
      if (t) storage.setItem(TOKEN_KEY, JSON.stringify(t))
      else storage.removeItem(TOKEN_KEY)
    } catch {
      // token stays in memory only
    }
  }

  async function requestToken({ interactive }: { interactive: boolean }) {
    const g = await gis()
    await new Promise<void>((resolve, reject) => {
      const tc = g.accounts.oauth2.initTokenClient({
        client_id: o.clientId,
        scope: GCAL_SCOPES.join(' '),
        callback: (r) => {
          if (r.error || !r.access_token) return reject(new GcalAuthError(r.error ? `Google sign-in: ${r.error}` : undefined))
          save({ value: r.access_token, expiresAt: now() + Number(r.expires_in ?? 3600) * 1000 })
          resolve()
        },
        error_callback: (e) => reject(new GcalAuthError(e.message ?? e.type)),
      })
      // `prompt: ''` renews silently when the user already consented; `consent` shows the popup.
      tc.requestAccessToken({ prompt: interactive ? 'consent' : '' })
    })
  }

  async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (!valid()) await requestToken({ interactive: false })
    const res = await doFetch(`${API}${path}`, {
      ...init,
      headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${token!.value}`, 'Content-Type': 'application/json' },
    })
    if (res.status === 401) {
      save(null)
      throw new GcalAuthError()
    }
    if (!res.ok) {
      let msg = res.statusText || `HTTP ${res.status}`
      try {
        const j = (await res.json()) as { error?: { message?: string } }
        msg = j.error?.message ?? msg
      } catch {
        // keep the status text
      }
      throw new GcalApiError(msg, res.status)
    }
    return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
  }

  const enc = encodeURIComponent

  return {
    requestToken,
    hasValidToken: valid,
    async revoke() {
      const t = token?.value
      save(null)
      if (t) (await gis()).accounts.oauth2.revoke(t)
    },
    async listCalendars() {
      const r = await api<{ items?: CalendarInfo[] }>('/users/me/calendarList?minAccessRole=reader')
      return (r.items ?? []).map((c) => ({ id: c.id, summary: c.summary, primary: c.primary, accessRole: c.accessRole }))
    },
    async listEvents(calendarId, timeMin, timeMax) {
      const events: GEvent[] = []
      let pageToken: string | undefined
      do {
        const q = `singleEvents=true&orderBy=startTime&maxResults=250&timeMin=${enc(timeMin)}&timeMax=${enc(timeMax)}${pageToken ? `&pageToken=${enc(pageToken)}` : ''}`
        const r = await api<{ items?: GEvent[]; nextPageToken?: string }>(`/calendars/${enc(calendarId)}/events?${q}`)
        events.push(...(r.items ?? []))
        pageToken = r.nextPageToken
      } while (pageToken)
      return events
    },
    async createCalendar(summary, timeZone) {
      const c = await api<CalendarInfo>('/calendars', { method: 'POST', body: JSON.stringify({ summary, timeZone }) })
      return { id: c.id, summary: c.summary }
    },
    async createEvent(calendarId, event: GEventInput) {
      const e = await api<{ id: string }>(`/calendars/${enc(calendarId)}/events`, { method: 'POST', body: JSON.stringify(event) })
      return { id: e.id }
    },
    async updateEvent(calendarId, eventId, event: GEventInput) {
      await api(`/calendars/${enc(calendarId)}/events/${enc(eventId)}`, { method: 'PUT', body: JSON.stringify(event) })
    },
    async deleteEvent(calendarId, eventId) {
      await api(`/calendars/${enc(calendarId)}/events/${enc(eventId)}`, { method: 'DELETE' })
    },
  }
}
