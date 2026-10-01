import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'
import { actions, makeItem } from '@/data/actions'
import { store } from '@/data/store'
import { resetGcalForTests } from '@/integrations/gcal/client'
import { calendarEvents } from '@/integrations/gcal/events-store'
import { createMockClient, type MockGoogle } from '@/integrations/gcal/mock-client'
import { GcalApiError } from '@/integrations/gcal/types'
import { resetStore } from '@/test/utils'

const D = '2026-10-02'
const go = (p: string) => window.history.pushState({}, '', p)
let google: MockGoogle

function plan(...titles: string[]) {
  titles.forEach((t, i) => {
    actions.addItem(makeItem({ id: `i${i}`, title: t }))
    actions.setGrade(`i${i}`, 'A')
    actions.addItemBlock(D, `i${i}`, { id: `b${i}`, estimateMin: 30 })
  })
}

beforeEach(() => {
  resetStore()
  resetGcalForTests()
  calendarEvents.clear()
  google = createMockClient({ calendars: [{ id: 'primary', summary: 'Erez', primary: true }, { id: 'work', summary: 'Work' }] })
  window.__2DO_GCAL_CLIENT__ = google
  actions.updateSettings({ review: { weekday: 6 } })
})
afterEach(() => {
  vi.unstubAllEnvs()
  delete window.__2DO_GCAL_CLIENT__
})

describe('Settings: Google Calendar', () => {
  it('explains the missing client id when nothing is configured and disables Connect', async () => {
    delete window.__2DO_GCAL_CLIENT__
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '')
    go('/settings')
    render(<App />)
    expect(await screen.findByTestId('gcal-unconfigured')).toHaveTextContent('VITE_GOOGLE_CLIENT_ID')
    expect(screen.getByTestId('gcal-connect')).toBeDisabled()
  })

  it('connects, lists calendars (primary pre-selected), toggles one, and disconnects', async () => {
    const user = userEvent.setup()
    go('/settings')
    render(<App />)
    await user.click(await screen.findByTestId('gcal-connect'))
    await waitFor(() => expect(screen.getByTestId('gcal-status')).toHaveTextContent('Connected'))
    const cals = await screen.findByTestId('gcal-calendars')
    expect(within(cals).getByRole('checkbox', { name: 'Erez' })).toBeChecked()
    expect(within(cals).getByRole('checkbox', { name: 'Work' })).not.toBeChecked()
    await user.click(within(cals).getByRole('checkbox', { name: 'Work' }))
    expect(store.getState().settings.gcal.readCalendarIds).toEqual(['primary', 'work'])
    await user.click(screen.getByTestId('gcal-disconnect'))
    await waitFor(() => expect(screen.getByTestId('gcal-status')).toHaveTextContent('Not connected'))
  })

  it('persists the sync mode', async () => {
    const user = userEvent.setup()
    go('/settings')
    render(<App />)
    await user.click(await screen.findByLabelText('Sync mode'))
    await user.click(await screen.findByRole('option', { name: /Manual/ }))
    expect(store.getState().settings.gcal.syncMode).toBe('manual')
  })
})

describe('Plan: events and push', () => {
  async function connect() {
    await google.requestToken({ interactive: true })
    localStorage.setItem('2do.gcal.linked', '1')
  }

  it('shows events from the chosen calendars on the plan timeline and stacks around them', async () => {
    await connect()
    const at = (hm: string) => new Date(`${D}T${hm}:00`).toISOString()
    google.events.primary = [{ id: 'p1', summary: 'Dentist', start: { dateTime: at('08:30') }, end: { dateTime: at('09:30') } }]
    actions.updateSettings({ gcal: { readCalendarIds: ['primary'] } })
    plan('Alpha')
    go(`/plan/${D}`)
    render(<App />)
    expect(await screen.findByTestId('calendar-event')).toHaveTextContent('Dentist')
    expect(screen.getByTestId('timeline-block')).toHaveTextContent('09:30')
  })

  it('push is disabled while not connected', () => {
    plan('Alpha')
    go(`/plan/${D}`)
    render(<App />)
    expect(screen.getByTestId('gcal-push')).toBeDisabled()
  })

  it('connected: push creates events, shows the badge, and the day is marked pushed', async () => {
    const user = userEvent.setup()
    plan('Alpha', 'Bravo')
    go('/settings')
    const { unmount } = render(<App />)
    await user.click(await screen.findByTestId('gcal-connect'))
    await waitFor(() => expect(screen.getByTestId('gcal-status')).toHaveTextContent('Connected'))
    unmount()
    go(`/plan/${D}`)
    render(<App />)
    await waitFor(() => expect(screen.getByTestId('gcal-push')).toBeEnabled())
    await user.click(screen.getByTestId('gcal-push'))
    expect(await screen.findByTestId('pushed-badge')).toBeInTheDocument()
    const cal = store.getState().settings.gcal.targetCalendarId!
    expect(google.events[cal].map((e) => e.summary)).toEqual(['1. Alpha', '2. Bravo'])
    expect(await screen.findByText('Synced with Google Calendar.')).toBeInTheDocument()
  })

  it('a failed push shows a banner with Retry; retry succeeds; the plan stays intact', async () => {
    const user = userEvent.setup()
    plan('Alpha')
    go('/settings')
    const { unmount } = render(<App />)
    await user.click(await screen.findByTestId('gcal-connect'))
    await waitFor(() => expect(screen.getByTestId('gcal-status')).toHaveTextContent('Connected'))
    unmount()
    go(`/plan/${D}`)
    render(<App />)
    await waitFor(() => expect(screen.getByTestId('gcal-push')).toBeEnabled())
    google.failNext(new GcalApiError('Backend Error', 503), 'createEvent')
    await user.click(screen.getByTestId('gcal-push'))
    const banner = await screen.findByTestId('gcal-banner')
    expect(banner).toHaveTextContent('Backend Error')
    expect(screen.getAllByTestId('plan-block')).toHaveLength(1)
    await user.click(within(banner).getByTestId('gcal-retry'))
    await waitFor(() => expect(screen.queryByTestId('gcal-banner')).not.toBeInTheDocument())
    expect(store.getState().plans[D].pushed).toBe(true)
  })

  it('shows a Reconnect banner when the linked session cannot be renewed', async () => {
    localStorage.setItem('2do.gcal.linked', '1')
    google.silentRenewal = false
    go('/tasks')
    render(<App />)
    const banner = await screen.findByTestId('gcal-banner')
    expect(banner).toHaveTextContent('needs to be reconnected')
    await userEvent.setup().click(within(banner).getByTestId('gcal-reconnect'))
    await waitFor(() => expect(screen.queryByTestId('gcal-banner')).not.toBeInTheDocument())
  })
})
