import { expect, test, type Page } from '@playwright/test'
import { item, seed } from './helpers'

const D = '2026-10-02'
const local = (hm: string) => new Date(`${D}T${hm}:00`).toISOString()

const GIS_STUB = `
window.google = { accounts: { oauth2: {
  initTokenClient: (cfg) => ({ requestAccessToken: (o) => { window.__gisPrompts = (window.__gisPrompts||[]).concat([o && o.prompt]); cfg.callback({ access_token: 'stub-token', expires_in: 3600 }) } }),
  revoke: (t, done) => done && done(),
} } };
`

/** Stubs Google Identity Services and the Calendar REST API; records every write. */
async function stubGoogle(page: Page) {
  const state = {
    calendars: [
      { id: 'primary', summary: 'Erez', primary: true, accessRole: 'owner' },
      { id: 'work', summary: 'Work', accessRole: 'reader' },
    ] as { id: string; summary: string; primary?: boolean; accessRole?: string }[],
    events: {} as Record<string, { id: string; summary: string; start?: unknown; end?: unknown; transparency?: string }[]>,
    writes: [] as string[],
    failCreateEvent: 0,
    seq: 0,
  }
  await page.route('https://accounts.google.com/gsi/client', (r) => r.fulfill({ contentType: 'text/javascript', body: GIS_STUB }))
  await page.route('https://www.googleapis.com/calendar/v3/**', async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const path = url.pathname.replace('/calendar/v3', '')
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    const m = req.method()
    if (path === '/users/me/calendarList') return json({ items: state.calendars })
    if (path === '/calendars' && m === 'POST') {
      const b = req.postDataJSON()
      const c = { id: `cal-${++state.seq}`, summary: b.summary }
      state.calendars.push(c)
      state.writes.push(`POST calendar ${b.summary}`)
      return json(c)
    }
    const ev = path.match(/^\/calendars\/([^/]+)\/events(?:\/([^/]+))?$/)
    if (ev) {
      const cal = decodeURIComponent(ev[1])
      const list = (state.events[cal] ??= [])
      if (m === 'GET') return json({ items: list })
      if (m === 'POST') {
        if (state.failCreateEvent > 0) {
          state.failCreateEvent--
          return json({ error: { message: 'Backend Error' } }, 503)
        }
        const b = req.postDataJSON()
        const e = { id: `ev-${++state.seq}`, ...b }
        list.push(e)
        state.writes.push(`POST event ${b.summary}`)
        return json(e)
      }
      if (m === 'PUT') {
        const b = req.postDataJSON()
        Object.assign(list.find((x) => x.id === ev[2])!, b)
        state.writes.push(`PUT event ${b.summary}`)
        return json({ id: ev[2] })
      }
      if (m === 'DELETE') {
        state.events[cal] = list.filter((x) => x.id !== ev[2])
        state.writes.push(`DELETE event ${ev[2]}`)
        return route.fulfill({ status: 204 })
      }
    }
    return json({ error: { message: `unexpected ${m} ${path}` } }, 500)
  })
  return state
}

const db = () => ({
  settings: { review: { weekday: 6 } },
  items: [
    item({ id: 'a', title: 'Alpha', grade: 'A', gradeRank: 1 }),
    item({ id: 'b', title: 'Bravo', grade: 'A', gradeRank: 2 }),
  ],
  plans: {
    [D]: {
      date: D, locked: false, pushed: false,
      blocks: [
        { id: 'ba', kind: 'item', itemId: 'a', rank: 1, estimateMin: 30, done: false },
        { id: 'bb', kind: 'item', itemId: 'b', rank: 2, estimateMin: 30, done: false },
      ],
    },
  },
})

async function connect(page: Page) {
  await page.goto('/settings')
  await page.getByTestId('gcal-connect').click()
  await expect(page.getByTestId('gcal-status')).toHaveText('Connected')
  await expect(page.getByTestId('gcal-calendars')).toBeVisible()
}

test('connect, read busy events onto the plan, push to a new 2DO calendar, then auto-sync edits', async ({ page }) => {
  const g = await stubGoogle(page)
  g.events.primary = [
    { id: 'p1', summary: 'Dentist', start: { dateTime: local('08:30') }, end: { dateTime: local('09:30') } },
    { id: 'p2', summary: 'Lunch (free)', transparency: 'transparent', start: { dateTime: local('12:00') }, end: { dateTime: local('13:00') } },
  ]
  await seed(page, db())
  await connect(page)
  await expect(page.getByRole('checkbox', { name: 'Erez' })).toBeChecked()

  await page.goto(`/plan/${D}`)
  await expect(page.getByTestId('calendar-event')).toHaveCount(1)
  await expect(page.getByTestId('calendar-event')).toContainText('Dentist')
  await expect(page.getByTestId('timeline-block').first()).toContainText('09:30')

  await page.getByTestId('gcal-push').click()
  await expect(page.getByTestId('pushed-badge')).toBeVisible()
  expect(g.writes).toEqual(['POST calendar 2DO', 'POST event 1. Alpha', 'POST event 2. Bravo'])

  // auto mode: ticking a block updates its event with a ✔ prefix, without touching the button
  await page.getByRole('button', { name: 'Remove from the plan' }).nth(1).click()
  await expect.poll(() => g.writes.filter((w) => w.startsWith('DELETE')).length, { timeout: 8000 }).toBe(1)
})

test('done blocks get a ✔ prefix via auto sync', async ({ page }) => {
  const g = await stubGoogle(page)
  const today = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const T = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
  await seed(page, {
    settings: { review: { weekday: (today.getDay() + 3) % 7 } },
    items: [item({ id: 'a', title: 'Alpha', grade: 'A', gradeRank: 1 })],
    plans: { [T]: { date: T, locked: false, pushed: false, blocks: [{ id: 'ba', kind: 'item', itemId: 'a', rank: 1, estimateMin: 30, done: false }] } },
  })
  await connect(page)
  await page.goto(`/plan/${T}`)
  await page.getByTestId('gcal-push').click()
  await expect(page.getByTestId('pushed-badge')).toBeVisible()
  await page.goto('/today')
  await page.getByRole('checkbox', { name: 'Mark “Alpha” done' }).click()
  await expect.poll(() => g.writes.at(-1), { timeout: 8000 }).toBe('PUT event ✔ 1. Alpha')
})

test('a failing push shows the banner and retry recovers', async ({ page }) => {
  const g = await stubGoogle(page)
  g.failCreateEvent = 1
  await seed(page, db())
  await connect(page)
  await page.goto(`/plan/${D}`)
  await page.getByTestId('gcal-push').click()
  const banner = page.getByTestId('gcal-banner')
  await expect(banner).toContainText('Backend Error')
  await expect(page.getByTestId('plan-block')).toHaveCount(2)
  await banner.getByTestId('gcal-retry').click()
  await expect(banner).toBeHidden()
  await expect(page.getByTestId('pushed-badge')).toBeVisible()
})

test('after a reload the linked session renews silently', async ({ page }) => {
  await stubGoogle(page)
  await seed(page, db())
  await connect(page)
  await page.evaluate(() => sessionStorage.removeItem('2do.gcal.token'))
  await page.reload()
  await expect(page.getByTestId('gcal-status')).toHaveText('Connected')
  expect(await page.evaluate(() => (window as unknown as { __gisPrompts: string[] }).__gisPrompts)).toEqual([''])
})
