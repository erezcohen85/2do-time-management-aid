import { createRealClient, type GisApi } from './real-client'
import { GCAL_SCOPES, GcalApiError, GcalAuthError } from './types'

function fakeGis(opts: { fail?: boolean; expiresIn?: number } = {}) {
  const requests: { prompt?: string; scope: string; clientId: string }[] = []
  const revoked: string[] = []
  let n = 0
  const gis: GisApi = {
    accounts: {
      oauth2: {
        initTokenClient: (cfg) => ({
          requestAccessToken: (o) => {
            requests.push({ prompt: o?.prompt, scope: cfg.scope, clientId: cfg.client_id })
            if (opts.fail) cfg.error_callback?.({ type: 'popup_closed' })
            else cfg.callback({ access_token: `tok${++n}`, expires_in: opts.expiresIn ?? 3600 })
          },
        }),
        revoke: (t, done) => {
          revoked.push(t)
          done?.()
        },
      },
    },
  }
  return { gis, requests, revoked }
}

function fakeFetch(handler: (url: string, init: RequestInit) => { status?: number; body?: unknown }) {
  const calls: { url: string; init: RequestInit }[] = []
  const f = (async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init })
    const r = handler(url, init)
    const status = r.status ?? 200
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: 'status',
      json: async () => r.body,
    } as Response
  }) as unknown as typeof fetch
  return { f, calls }
}

const mem = () => {
  const d: Record<string, string> = {}
  return { getItem: (k: string) => d[k] ?? null, setItem: (k: string, v: string) => void (d[k] = v), removeItem: (k: string) => void delete d[k] }
}

function make(fetchHandler: Parameters<typeof fakeFetch>[0] = () => ({ body: {} }), gisOpts = {}, now = () => 1_000_000) {
  const g = fakeGis(gisOpts)
  const net = fakeFetch(fetchHandler)
  const client = createRealClient({ clientId: 'cid', fetch: net.f, loadGis: async () => g.gis, now, storage: mem() })
  return { client, g, net }
}

describe('token handling', () => {
  it('interactive request asks for consent with the least-privilege scopes', async () => {
    const { client, g } = make()
    expect(client.hasValidToken()).toBe(false)
    await client.requestToken({ interactive: true })
    expect(g.requests[0]).toEqual({ prompt: 'consent', scope: GCAL_SCOPES.join(' '), clientId: 'cid' })
    expect(client.hasValidToken()).toBe(true)
  })
  it('scopes are read events, read calendar list, and app-created calendars only', () => {
    expect(GCAL_SCOPES).toEqual([
      'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
      'https://www.googleapis.com/auth/calendar.events.readonly',
      'https://www.googleapis.com/auth/calendar.app.created',
    ])
  })
  it('renews silently (empty prompt) when the token expired', async () => {
    let t = 1_000_000
    const { client, g, net } = make(() => ({ body: { items: [] } }), { expiresIn: 60 }, () => t)
    await client.requestToken({ interactive: true })
    t += 120_000
    expect(client.hasValidToken()).toBe(false)
    await client.listCalendars()
    expect(g.requests.map((r) => r.prompt)).toEqual(['consent', ''])
    expect(net.calls[0].init.headers).toMatchObject({ Authorization: 'Bearer tok2' })
  })
  it('a failed silent renewal becomes a reconnect error', async () => {
    const { client } = make(() => ({ body: {} }), { fail: true })
    await expect(client.listCalendars()).rejects.toBeInstanceOf(GcalAuthError)
  })
  it('a 401 clears the token and asks to reconnect', async () => {
    const { client } = make(() => ({ status: 401, body: {} }))
    await client.requestToken({ interactive: true })
    await expect(client.listCalendars()).rejects.toBeInstanceOf(GcalAuthError)
    expect(client.hasValidToken()).toBe(false)
  })
  it('revoke drops the token and tells Google', async () => {
    const { client, g } = make()
    await client.requestToken({ interactive: true })
    await client.revoke()
    expect(g.revoked).toEqual(['tok1'])
    expect(client.hasValidToken()).toBe(false)
  })
})

describe('REST calls', () => {
  it('lists calendars with reader access', async () => {
    const { client, net } = make(() => ({ body: { items: [{ id: 'a', summary: 'A', primary: true, accessRole: 'owner', extra: 1 }] } }))
    await client.requestToken({ interactive: true })
    expect(await client.listCalendars()).toEqual([{ id: 'a', summary: 'A', primary: true, accessRole: 'owner' }])
    expect(net.calls[0].url).toBe('https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader')
  })
  it('lists events with single events, time window, and follows pages', async () => {
    let page = 0
    const { client, net } = make(() => ({ body: page++ === 0 ? { items: [{ id: '1' }], nextPageToken: 'p2' } : { items: [{ id: '2' }] } }))
    await client.requestToken({ interactive: true })
    const ev = await client.listEvents('me@x.com', '2026-10-01T00:00:00.000Z', '2026-10-02T00:00:00.000Z')
    expect(ev.map((e) => e.id)).toEqual(['1', '2'])
    expect(net.calls[0].url).toContain('/calendars/me%40x.com/events?singleEvents=true&orderBy=startTime')
    expect(net.calls[0].url).toContain('timeMin=2026-10-01T00%3A00%3A00.000Z')
    expect(net.calls[1].url).toContain('pageToken=p2')
  })
  it('creates a calendar, creates/updates/deletes events with the right verbs and bodies', async () => {
    const { client, net } = make((url, init) => {
      if (init.method === 'DELETE') return { status: 204 }
      if (url.endsWith('/calendars')) return { body: { id: 'cal1', summary: '2DO' } }
      return { body: { id: 'ev1' } }
    })
    await client.requestToken({ interactive: true })
    expect(await client.createCalendar('2DO', 'Asia/Jerusalem')).toEqual({ id: 'cal1', summary: '2DO' })
    const input = { summary: '1. A', start: { dateTime: 's' }, end: { dateTime: 'e' } }
    expect(await client.createEvent('cal1', input)).toEqual({ id: 'ev1' })
    await client.updateEvent('cal1', 'ev1', input)
    await client.deleteEvent('cal1', 'ev1')
    expect(net.calls.map((c) => `${c.init.method} ${c.url.replace('https://www.googleapis.com/calendar/v3', '')}`)).toEqual([
      'POST /calendars',
      'POST /calendars/cal1/events',
      'PUT /calendars/cal1/events/ev1',
      'DELETE /calendars/cal1/events/ev1',
    ])
    expect(JSON.parse(net.calls[0].init.body as string)).toEqual({ summary: '2DO', timeZone: 'Asia/Jerusalem' })
    expect(JSON.parse(net.calls[1].init.body as string)).toEqual(input)
  })
  it('other errors carry the status and Google message', async () => {
    const { client } = make(() => ({ status: 404, body: { error: { message: 'Not Found' } } }))
    await client.requestToken({ interactive: true })
    await expect(client.deleteEvent('c', 'e')).rejects.toMatchObject({ status: 404, message: 'Not Found' })
    await expect(client.deleteEvent('c', 'e')).rejects.toBeInstanceOf(GcalApiError)
  })
})
