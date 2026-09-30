import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'
import { actions, makeItem } from '@/data/actions'
import { store } from '@/data/store'
import { ritualState } from '@/lib/ritual-state'
import { resetStore } from '@/test/utils'

const THU = '2026-10-01'
const go = (p: string) => window.history.pushState({}, '', p)
const mk = (id: string, title: string, extra: object = {}) => {
  actions.addItem(makeItem({ id, title, ...extra }))
  actions.setGrade(id, 'A')
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-01T09:00:00'))
  resetStore()
  localStorage.clear()
  go(`/plan/${THU}`)
})
afterEach(() => vi.useRealTimers())

describe('weekly review block', () => {
  it('is inserted at rank 1 on the review day, shifting the rest, and shows in the timeline', async () => {
    mk('a', 'Alpha')
    actions.addItemBlock(THU, 'a', { id: 'ba' })
    render(<App />)
    await waitFor(() => expect(store.getState().plans[THU].blocks.some((b) => b.kind === 'review')).toBe(true))
    const blocks = screen.getAllByTestId('plan-block')
    expect(blocks[0]).toHaveTextContent('Weekly review')
    expect(blocks[1]).toHaveTextContent('Alpha')
    expect(store.getState().plans[THU].blocks.find((b) => b.kind === 'review')).toMatchObject({ rank: 1, estimateMin: 45, pinnedStart: '08:30' })
  })

  it('takes a slot under the cap and is not re-inserted once removed', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => expect(screen.getByTestId('capacity-count')).toHaveTextContent('1/6'))
    await user.click(screen.getByRole('button', { name: 'Remove from the plan' }))
    expect(store.getState().plans[THU].blocks).toHaveLength(0)
    act(() => vi.setSystemTime(new Date('2026-10-01T09:05:00')))
    await user.click(screen.getByTestId('day-tab-2026-10-02'))
    await user.click(screen.getByTestId(`day-tab-${THU}`))
    expect(store.getState().plans[THU].blocks).toHaveLength(0)
  })

  it('does not appear on other days or on past review days', () => {
    go('/plan/2026-10-02')
    render(<App />)
    expect(store.getState().plans['2026-10-02']?.blocks ?? []).toHaveLength(0)
  })

  it('does not rewrite past weeks when browsing', () => {
    go('/plan/2026-09-24')
    render(<App />)
    expect(store.getState().plans['2026-09-24']).toBeUndefined()
  })

  it('also appears on Today', async () => {
    go('/today')
    render(<App />)
    await waitFor(() => expect(screen.getByTestId('today-block')).toHaveTextContent('Weekly review'))
  })

  it('follows the configured review day', async () => {
    actions.updateSettings({ review: { weekday: 5 } })
    go('/plan/2026-10-02')
    vi.setSystemTime(new Date('2026-10-01T09:00:00'))
    render(<App />)
    await waitFor(() => expect(store.getState().plans['2026-10-02'].blocks[0].kind).toBe('review'))
  })
})

describe('review panel', () => {
  it('shows only on the review day', () => {
    go('/plan/2026-10-02')
    render(<App />)
    expect(screen.queryByTestId('review-panel')).not.toBeInTheDocument()
  })

  it('scorecard: per-day scores, full days, timer minutes and done per grade', () => {
    mk('a', 'Alpha')
    mk('b', 'Bravo')
    actions.addItemBlock('2026-09-28', 'a', { id: 'x1' })
    actions.setBlockDone('2026-09-28', 'x1', true, '2026-09-28T10:00:00')
    actions.addItemBlock('2026-09-29', 'b', { id: 'x2' })
    actions.addSession({ id: 's1', mode: 'pomodoro', start: '2026-09-28T09:00:00', end: '2026-09-28T09:25:00', itemId: 'a' })
    actions.addSession({ id: 's2', mode: 'stopwatch', start: '2026-09-29T09:00:00', end: '2026-09-29T09:10:00' })
    render(<App />)
    expect(screen.getByTestId('review-day-2026-09-28')).toHaveTextContent('1/1')
    expect(screen.getByTestId('review-day-2026-09-29')).toHaveTextContent('0/1')
    expect(screen.getByTestId('review-full-days')).toHaveTextContent('1')
    expect(screen.getByTestId('review-tagged')).toHaveTextContent('25m')
    expect(screen.getByTestId('review-untagged')).toHaveTextContent('10m')
    expect(screen.getByTestId('review-grade-A')).toHaveTextContent('1')
  })

  it('active projects walk: SMART progress, re-grade, carried-over items, weekly note', async () => {
    const user = userEvent.setup()
    actions.addArea({ id: 'ar', name: 'Work' })
    actions.addProject({ id: 'p1', areaId: 'ar', name: 'Landing', smart: { metric: 'sections', target: 5, current: 2 } })
    actions.addProject({ id: 'p2', areaId: 'ar', name: 'Empty project' })
    mk('a', 'Write hero', { projectId: 'p1', carryOver: 2 })
    actions.addItem(makeItem({ id: 'z', title: 'Done thing', projectId: 'p2', done: true }))
    render(<App />)
    const projects = screen.getAllByTestId('review-project')
    expect(projects).toHaveLength(1)
    const p = within(projects[0])
    expect(p.getByTestId('review-project-progress')).toHaveTextContent('2 of 5 sections')
    expect(p.getByTestId('review-carried')).toHaveTextContent('Write hero')
    await user.click(p.getByRole('radio', { name: /Grade B/ }))
    expect(store.getState().items.find((i) => i.id === 'a')!.grade).toBe('B')
    const note = p.getByLabelText('Note for this week')
    await user.type(note, 'needs a rewrite')
    await user.tab()
    expect(store.getState().reviews['2026-09-27'].projectNotes.p1).toBe('needs a rewrite')
  })

  it('reflection saves per week and is browsable by flipping weeks', async () => {
    const user = userEvent.setup()
    render(<App />)
    const well = screen.getByLabelText('What went well')
    await user.type(well, 'shipped the thing')
    await user.tab()
    expect(store.getState().reviews['2026-09-27'].wentWell).toBe('shipped the thing')
    await user.click(screen.getByRole('button', { name: 'Next week' }))
    expect(screen.getByLabelText('What went well')).toHaveValue('')
    await user.click(screen.getByRole('button', { name: 'Previous week' }))
    expect(screen.getByLabelText('What went well')).toHaveValue('shipped the thing')
  })

  it('completing the review ticks its block; reopening undoes it', async () => {
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() => expect(store.getState().plans[THU]?.blocks.length).toBe(1))
    await user.click(screen.getByTestId('review-complete'))
    expect(store.getState().reviews['2026-09-27'].completedAt).toBeDefined()
    expect(store.getState().plans[THU].blocks[0].done).toBe(true)
    expect(screen.getByTestId('review-completed')).toBeInTheDocument()
    await user.click(screen.getByTestId('review-reopen'))
    expect(store.getState().plans[THU].blocks[0].done).toBe(false)
  })

  it('ticking the review block on Today completes the review', async () => {
    const user = userEvent.setup()
    go('/today')
    render(<App />)
    await user.click(await screen.findByRole('checkbox', { name: 'Mark “Weekly review” done' }))
    expect(store.getState().reviews['2026-09-27'].completedAt).toBeDefined()
  })
})

describe('planning reminder', () => {
  it('shows a banner after the evening time that opens tomorrow and then stays away', async () => {
    const user = userEvent.setup()
    vi.setSystemTime(new Date('2026-10-01T21:05:00'))
    go('/tasks')
    render(<App />)
    const banner = await screen.findByTestId('ritual-banner')
    expect(banner).toHaveTextContent('Time to plan tomorrow.')
    expect(screen.getByTestId('plan-dot')).toBeInTheDocument()
    await user.click(within(banner).getByRole('button', { name: 'Open planning' }))
    expect(window.location.pathname).toBe('/plan/2026-10-02')
    expect(screen.queryByTestId('ritual-banner')).not.toBeInTheDocument()
    expect(ritualState.handled()).toBe('2026-10-01')
  })

  it('can be dismissed', async () => {
    const user = userEvent.setup()
    vi.setSystemTime(new Date('2026-10-01T21:05:00'))
    go('/tasks')
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Not now' }))
    expect(screen.queryByTestId('ritual-banner')).not.toBeInTheDocument()
  })

  it('is silent before the time, when tomorrow is planned, when reminders are off, or in anytime mode', () => {
    go('/tasks')
    vi.setSystemTime(new Date('2026-10-01T20:00:00'))
    const a = render(<App />)
    expect(screen.queryByTestId('ritual-banner')).not.toBeInTheDocument()
    a.unmount()

    vi.setSystemTime(new Date('2026-10-01T21:30:00'))
    mk('a', 'Alpha')
    actions.addItemBlock('2026-10-02', 'a', { id: 'b' })
    const b = render(<App />)
    expect(screen.queryByTestId('ritual-banner')).not.toBeInTheDocument()
    b.unmount()

    actions.removeBlock('2026-10-02', 'b')
    actions.updateSettings({ ritual: { reminder: false } })
    const c = render(<App />)
    expect(screen.queryByTestId('ritual-banner')).not.toBeInTheDocument()
    c.unmount()

    actions.updateSettings({ ritual: { reminder: true, mode: 'anytime' } })
    render(<App />)
    expect(screen.queryByTestId('ritual-banner')).not.toBeInTheDocument()
  })

  it('shows a dot on Plan & Review on an unfinished review day', () => {
    go('/tasks')
    render(<App />)
    expect(screen.getByTestId('plan-dot')).toBeInTheDocument()
  })
})
