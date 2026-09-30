import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'
import { actions, makeItem } from '@/data/actions'
import { store } from '@/data/store'
import { pools } from '@/i18n/microcopy'
import { calendarEvents } from '@/integrations/gcal/events-store'
import { timerPrefs } from '@/timer/prefs'
import { resetStore } from '@/test/utils'

const TODAY = '2026-10-01'
const go = (p: string) => window.history.pushState({}, '', p)
const setNow = (iso: string) => vi.setSystemTime(new Date(iso))
const mk = (id: string, title: string, grade: 'A' | 'B' = 'A') => {
  actions.addItem(makeItem({ id, title }))
  actions.setGrade(id, grade)
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  setNow('2026-10-01T11:32:00')
  resetStore()
  timerPrefs.reset()
  localStorage.clear()
  calendarEvents.clear()
  go('/today')
})
afterEach(() => vi.useRealTimers())

function plan3() {
  mk('a', 'Weekly notes')
  mk('b', 'Landing copy')
  mk('c', 'Call accountant')
  actions.addItemBlock(TODAY, 'a', { id: 'ba', estimateMin: 45 })
  actions.addItemBlock(TODAY, 'b', { id: 'bb', estimateMin: 120 })
  actions.addItemBlock(TODAY, 'c', { id: 'bc', estimateMin: 30 })
}

describe('Today: timeline', () => {
  it('shows an empty state that links to planning', () => {
    render(<App />)
    expect(screen.getByText('Nothing planned for today yet.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Plan the day' })).toHaveAttribute('href', `/plan/${TODAY}`)
  })

  it('lists blocks in order with a now line, current highlight and score', () => {
    plan3()
    render(<App />)
    const blocks = screen.getAllByTestId('today-block')
    expect(blocks).toHaveLength(3)
    expect(blocks[0]).toHaveAttribute('data-current', 'true')
    expect(screen.getByTestId('now-line')).toHaveTextContent('11:32')
    expect(screen.getByTestId('today-score')).toHaveTextContent('0/3 done')
  })

  it('drift: behind by now minus the end of the top unfinished block', () => {
    plan3() // a: 08:30-09:15, now 11:32 -> 137m behind
    render(<App />)
    expect(screen.getByTestId('drift')).toHaveTextContent('137m behind')
  })

  it('drift: on track inside the current block; ahead before the next starts', () => {
    plan3()
    setNow('2026-10-01T09:00:00')
    const { unmount } = render(<App />)
    expect(screen.getByTestId('drift')).toHaveTextContent('on track')
    unmount()
    actions.setBlockDone(TODAY, 'ba', true)
    setNow('2026-10-01T08:45:00')
    render(<App />)
    expect(screen.getByTestId('drift')).toHaveTextContent('30m ahead')
  })

  it('draws calendar events and flows blocks around them', () => {
    plan3()
    calendarEvents.set(TODAY, [{ id: 'e', title: 'Standup', start: '08:30', end: '09:00' }])
    render(<App />)
    expect(screen.getByTestId('calendar-event')).toHaveTextContent('Standup')
    expect(screen.getAllByTestId('timeline-block')[0]).toHaveTextContent('09:00')
  })
})

describe('Today: ticking', () => {
  it('ticks a block, updates the score and the item, advances the current highlight', async () => {
    const user = userEvent.setup()
    plan3()
    render(<App />)
    await user.click(screen.getByRole('checkbox', { name: 'Mark “Weekly notes” done' }))
    expect(store.getState().items.find((i) => i.id === 'a')!.done).toBe(true)
    expect(screen.getByTestId('today-score')).toHaveTextContent('1/3 done')
    expect(screen.getAllByTestId('today-block')[1]).toHaveAttribute('data-current', 'true')
    expect(screen.getByTestId('today-badge')).toHaveTextContent('1/3')
  })

  it('soft order: out-of-order tick works and nudges', async () => {
    const user = userEvent.setup()
    plan3()
    render(<App />)
    await user.click(screen.getByRole('checkbox', { name: 'Mark “Call accountant” done' }))
    expect(store.getState().plans[TODAY].blocks.find((b) => b.id === 'bc')!.done).toBe(true)
    expect(await screen.findByText(/ranked higher and still open/)).toBeInTheDocument()
  })

  it('hard order: only the top unfinished block is tickable', async () => {
    plan3()
    actions.updateSettings({ ivyOrder: 'hard' })
    render(<App />)
    expect(screen.getByRole('checkbox', { name: 'Mark “Weekly notes” done' })).toBeEnabled()
    expect(screen.getByRole('checkbox', { name: 'Mark “Call accountant” done' })).toBeDisabled()
  })
})

describe('Today: carry-over pool', () => {
  it('quick-adds a candidate to today, and refuses beyond a hard cap', async () => {
    const user = userEvent.setup()
    for (let i = 0; i < 7; i++) mk(`p${i}`, `Pool ${i}`)
    for (let i = 0; i < 5; i++) actions.addItemBlock(TODAY, `p${i}`, { id: `b${i}` })
    render(<App />)
    await user.click(screen.getByRole('button', { name: /Carry-over pool/ }))
    await user.click(screen.getByRole('button', { name: 'Add “Pool 5” to today' }))
    expect(store.getState().plans[TODAY].blocks).toHaveLength(6)
    await user.click(screen.getByRole('button', { name: 'Add “Pool 6” to today' }))
    expect(store.getState().plans[TODAY].blocks).toHaveLength(6)
    expect(await screen.findByText(/Today is full/)).toBeInTheDocument()
  })
})

describe('Timer panel', () => {
  it('starts, pauses, resumes and stops a pomodoro; shows a microcopy line', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByTestId('timer-digits')).toHaveTextContent('25:00')
    await user.click(screen.getByTestId('timer-start'))
    expect(store.getState().timer).toMatchObject({ mode: 'pomodoro', phase: 'work', status: 'running' })
    expect(pools.en.start.some((l) => screen.getByTestId('timer-line').textContent?.includes(l))).toBe(true)
    act(() => setNow('2026-10-01T11:37:10'))
    await waitFor(() => expect(screen.getByTestId('timer-digits')).toHaveTextContent('19:50'))
    await user.click(screen.getByTestId('timer-pause'))
    act(() => setNow('2026-10-01T12:30:00'))
    await user.click(screen.getByTestId('timer-resume'))
    expect(store.getState().timer).toMatchObject({ status: 'running' })
    await user.click(screen.getByTestId('timer-stop'))
    expect(store.getState().timer).toBeNull()
    expect(store.getState().sessions).toHaveLength(2)
    expect(store.getState().sessions.every((s) => s.end)).toBe(true)
  })

  it('countdown uses the typed minutes; stopwatch counts up', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByTestId('timer-mode-countdown'))
    const min = screen.getByLabelText('Minutes')
    await user.clear(min)
    await user.type(min, '7')
    expect(screen.getByTestId('timer-digits')).toHaveTextContent('07:00')
    await user.click(screen.getByTestId('timer-start'))
    expect(store.getState().timer!.durationMs).toBe(7 * 60000)
    await user.click(screen.getByTestId('timer-stop'))
    await user.click(screen.getByTestId('timer-mode-stopwatch'))
    await user.click(screen.getByTestId('timer-start'))
    act(() => setNow('2026-10-01T11:34:05'))
    await waitFor(() => expect(screen.getByTestId('timer-digits')).toHaveTextContent('02:05'))
  })

  it('presets: picks a saved work/break pair', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByTestId('timer-mode-preset'))
    expect(screen.getByTestId('timer-digits')).toHaveTextContent('52:00')
    await user.click(screen.getByTestId('timer-start'))
    expect(store.getState().timer!.durationMs).toBe(52 * 60000)
  })

  it('tags an item before starting, and the session records the tag', async () => {
    const user = userEvent.setup()
    mk('a', 'Landing copy')
    render(<App />)
    await user.click(screen.getByRole('combobox', { name: 'Working on' }))
    await user.click(await screen.findByRole('option', { name: 'Landing copy' }))
    await user.click(screen.getByTestId('timer-start'))
    expect(store.getState().sessions[0].itemId).toBe('a')
  })

  it('▶ on a block starts a timer tagged to that item and shows the header mini-timer on every screen', async () => {
    const user = userEvent.setup()
    plan3()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Start a timer on “Landing copy”' }))
    expect(store.getState().timer!.itemId).toBe('b')
    expect(screen.getByTestId('mini-timer-digits')).toHaveTextContent('25:00')
    await user.click(screen.getByTestId('nav-settings'))
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByTestId('mini-timer')).toBeInTheDocument()
    await user.click(screen.getByTestId('mini-timer'))
    expect(window.location.pathname).toBe('/today')
  })

  it('survives a reload: remounting shows the same running timer', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    await user.click(screen.getByTestId('timer-start'))
    unmount()
    act(() => setNow('2026-10-01T11:42:00'))
    store.reload() // what a page reload does
    render(<App />)
    expect(screen.getByTestId('timer-digits')).toHaveTextContent('15:00')
    expect(screen.getByTestId('timer-pause')).toBeInTheDocument()
  })

  it('ends a phase when time runs out: readies the break and logs the session', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByTestId('timer-start'))
    act(() => setNow('2026-10-01T12:00:00'))
    await waitFor(() => expect(store.getState().timer?.phase).toBe('shortBreak'), { timeout: 3000 })
    expect(store.getState().timer!.status).toBe('paused')
    expect(store.getState().sessions[0].end).toBe(new Date('2026-10-01T11:57:00').toISOString())
    expect(screen.getByTestId('timer-phase')).toHaveTextContent('Short break')
    expect(screen.getByTestId('timer-skip')).toBeInTheDocument()
  })

  it('renders Hebrew microcopy', async () => {
    const user = userEvent.setup()
    actions.updateSettings({ language: 'he' })
    render(<App />)
    await user.click(screen.getByTestId('timer-start'))
    expect(pools.he.start.some((l) => screen.getByTestId('timer-line').textContent?.includes(l))).toBe(true)
  })
})

describe('Today: within the shell', () => {
  it('scoped queries work (sanity)', () => {
    plan3()
    render(<App />)
    expect(within(screen.getByTestId('today-timeline')).getAllByTestId('today-block')).toHaveLength(3)
  })
})
