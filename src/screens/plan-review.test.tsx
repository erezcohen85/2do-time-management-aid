import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'
import { actions, makeItem } from '@/data/actions'
import { store } from '@/data/store'
import { calendarEvents } from '@/integrations/gcal/events-store'
import { resetStore } from '@/test/utils'

const D = '2026-10-02'
const go = (path: string) => window.history.pushState({}, '', path)
const plan = (d = D) => store.getState().plans[d]
const mk = (id: string, title: string, grade: 'A' | 'B' | null = 'A', extra: object = {}) => {
  actions.addItem(makeItem({ id, title, ...extra }))
  if (grade) actions.setGrade(id, grade)
}

beforeEach(() => {
  resetStore()
  calendarEvents.clear()
  go(`/plan/${D}`)
})

describe('Plan & Review: week header and tabs', () => {
  it('shows the week label and flips weeks endlessly', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByTestId('week-label')).toHaveTextContent(/Week 40 · 27 Sept? – 3 Oct 2026/)
    await user.click(screen.getByRole('button', { name: 'Next week' }))
    expect(window.location.pathname).toBe('/plan/2026-10-09')
    expect(screen.getByTestId('week-label')).toHaveTextContent('Week 41')
    await user.click(screen.getByRole('button', { name: 'Previous week' }))
    await user.click(screen.getByRole('button', { name: 'Previous week' }))
    expect(window.location.pathname).toBe('/plan/2026-09-25')
  })

  it('shows a tab per visible day with scores, and switching tabs changes the plan', async () => {
    const user = userEvent.setup()
    mk('a', 'Alpha')
    actions.addItemBlock('2026-10-01', 'a', { id: 'b1' })
    actions.setBlockDone('2026-10-01', 'b1', true)
    render(<App />)
    expect(screen.getAllByRole('tab')).toHaveLength(7)
    expect(screen.getByTestId('day-score-2026-10-01')).toHaveTextContent('1/1')
    await user.click(screen.getByTestId('day-tab-2026-10-01'))
    expect(window.location.pathname).toBe('/plan/2026-10-01')
  })

  it('respects the visible-days setting', () => {
    actions.updateSettings({ visibleDays: [1, 2, 3, 4, 5], weekStart: 1 })
    render(<App />)
    expect(screen.getAllByRole('tab')).toHaveLength(5)
  })
})

describe('Plan & Review: candidates', () => {
  it('lists leaf, open, graded items grouped by grade and greys blocked ones', () => {
    mk('a', 'Alpha')
    mk('b', 'Bravo', 'A', { waitingOnId: 'a' })
    mk('p', 'Parent', 'A')
    mk('s', 'Sub', 'B', { parentId: 'p' })
    mk('u', 'Ungraded one', null)
    render(<App />)
    const pane = screen.getByTestId('candidates-pane')
    expect(within(pane).getByText('Alpha')).toBeInTheDocument()
    expect(within(pane).queryByText('Parent')).not.toBeInTheDocument()
    expect(within(pane).queryByText('Ungraded one')).not.toBeInTheDocument()
    const bravo = within(pane).getByText('Bravo').closest('[data-testid=candidate]')!
    expect(bravo).toHaveAttribute('data-blocked', 'true')
    expect(within(bravo as HTMLElement).queryByRole('button', { name: /Add “Bravo”/ })).not.toBeInTheDocument()
  })

  it('puts due and overdue items in their own group', () => {
    mk('d', 'Overdue thing', 'B', { due: '2026-09-30' })
    render(<App />)
    expect(within(screen.getByTestId('cand-group-due')).getByText('Overdue thing')).toBeInTheDocument()
  })

  it('filters by text', async () => {
    const user = userEvent.setup()
    mk('a', 'Alpha')
    mk('b', 'Bravo')
    render(<App />)
    await user.type(screen.getByLabelText('Filter candidates'), 'brav')
    const pane = screen.getByTestId('candidates-pane')
    expect(within(pane).queryByText('Alpha')).not.toBeInTheDocument()
    expect(within(pane).getByText('Bravo')).toBeInTheDocument()
  })
})

describe('Plan & Review: building the day', () => {
  it('adds with an estimate prompt prefilled with the default, then stacks from day start', async () => {
    const user = userEvent.setup()
    mk('a', 'Alpha')
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Add “Alpha” to the plan' }))
    const field = await screen.findByLabelText('Estimate (min)')
    expect(field).toHaveValue(30)
    await user.clear(field)
    await user.type(field, '45{Enter}')
    expect(plan().blocks[0]).toMatchObject({ itemId: 'a', estimateMin: 45, rank: 1 })
    const block = within(screen.getByTestId('plan-timeline')).getByTestId('plan-block')
    expect(block).toHaveTextContent('Alpha')
    expect(screen.getByTestId('timeline-block')).toHaveTextContent('08:30')
    expect(screen.getByTestId('capacity-footer')).toHaveTextContent('1/6')
    expect(screen.getByTestId('capacity-footer')).toHaveTextContent('45m planned')
    expect(screen.getByTestId('capacity-fits')).toBeInTheDocument()
    expect(within(screen.getByTestId('candidates-pane')).queryByText('Alpha')).not.toBeInTheDocument()
  })

  it('prefills the prompt with the item estimate', async () => {
    const user = userEvent.setup()
    mk('a', 'Alpha', 'A', { estimateMin: 90 })
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Add “Alpha” to the plan' }))
    expect(await screen.findByLabelText('Estimate (min)')).toHaveValue(90)
  })

  it('refuses the 7th block under the hard cap with a message', async () => {
    const user = userEvent.setup()
    for (let i = 0; i < 7; i++) mk(`i${i}`, `Item ${i}`)
    for (let i = 0; i < 6; i++) actions.addItemBlock(D, `i${i}`, { id: `b${i}` })
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Add “Item 6” to the plan' }))
    expect(await screen.findByText(/daily cap of 6 is reached/)).toBeInTheDocument()
    expect(plan().blocks).toHaveLength(6)
    expect(screen.queryByLabelText('Estimate (min)')).not.toBeInTheDocument()
  })

  it('allows a 7th under the soft cap and shows a warning', async () => {
    const user = userEvent.setup()
    actions.updateSettings({ ivyCap: 'soft' })
    for (let i = 0; i < 7; i++) mk(`i${i}`, `Item ${i}`)
    for (let i = 0; i < 6; i++) actions.addItemBlock(D, `i${i}`, { id: `b${i}` })
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Add “Item 6” to the plan' }))
    await user.type(await screen.findByLabelText('Estimate (min)'), '{Enter}')
    expect(plan().blocks).toHaveLength(7)
    expect(screen.getByTestId('cap-over')).toBeInTheDocument()
    expect(screen.getByTestId('capacity-count')).toHaveTextContent('7/6')
  })

  it('flows blocks around calendar events', () => {
    mk('a', 'Alpha')
    mk('b', 'Bravo')
    actions.addItemBlock(D, 'a', { id: 'b1', estimateMin: 60 })
    actions.addItemBlock(D, 'b', { id: 'b2', estimateMin: 30 })
    calendarEvents.set(D, [{ id: 'e', title: 'Standup', start: '09:00', end: '09:30' }])
    render(<App />)
    const times = screen.getAllByTestId('timeline-block').map((b) => b.textContent?.slice(0, 5))
    expect(times).toEqual(['09:30', '10:30'])
    expect(screen.getByTestId('calendar-event')).toHaveTextContent('Standup')
  })

  it('removes a block back to the candidates and renumbers', async () => {
    const user = userEvent.setup()
    mk('a', 'Alpha')
    mk('b', 'Bravo')
    actions.addItemBlock(D, 'a', { id: 'b1' })
    actions.addItemBlock(D, 'b', { id: 'b2' })
    render(<App />)
    const first = screen.getAllByTestId('plan-block')[0]
    await user.click(within(first).getByRole('button', { name: 'Remove from the plan' }))
    expect(plan().blocks.map((b) => [b.id, b.rank])).toEqual([['b2', 1]])
    expect(within(screen.getByTestId('candidates-pane')).getByText('Alpha')).toBeInTheDocument()
  })

  it('pins a block to a time and unpins it', async () => {
    const user = userEvent.setup()
    mk('a', 'Alpha')
    actions.addItemBlock(D, 'a', { id: 'b1' })
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Pin to a time' }))
    const input = await screen.findByLabelText('Start time')
    await user.clear(input)
    await user.type(input, '10:15')
    await user.click(screen.getByRole('button', { name: 'Pin' }))
    expect(plan().blocks[0].pinnedStart).toBe('10:15')
    expect(screen.getByTestId('timeline-block')).toHaveTextContent('10:15')
    await user.click(screen.getByRole('button', { name: 'Pinned at 10:15' }))
    await user.click(await screen.findByRole('button', { name: 'Unpin' }))
    expect(plan().blocks[0].pinnedStart).toBeUndefined()
  })

  it('changes a block estimate', async () => {
    const user = userEvent.setup()
    mk('a', 'Alpha')
    actions.addItemBlock(D, 'a', { id: 'b1' })
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Change estimate' }))
    const f = await screen.findByLabelText('Estimate (min)')
    await user.clear(f)
    await user.type(f, '90{Enter}')
    expect(plan().blocks[0].estimateMin).toBe(90)
  })

  it('warns when the plan ends after the cutoff', () => {
    mk('a', 'Alpha')
    actions.addItemBlock(D, 'a', { id: 'b1', estimateMin: 840 })
    render(<App />)
    expect(screen.getByTestId('capacity-overflow')).toHaveTextContent('ends 22:30')
  })

  it('lock freezes the day; unlock restores editing', async () => {
    const user = userEvent.setup()
    mk('a', 'Alpha')
    mk('b', 'Bravo')
    actions.addItemBlock(D, 'a', { id: 'b1' })
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Lock day' }))
    expect(plan().locked).toBe(true)
    expect(screen.getByRole('button', { name: 'Remove from the plan' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Add “Bravo” to the plan' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Unlock day' }))
    expect(screen.getByRole('button', { name: 'Remove from the plan' })).toBeEnabled()
  })

  it('past days are editable', async () => {
    const user = userEvent.setup()
    mk('a', 'Alpha')
    go('/plan/2025-01-06')
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Add “Alpha” to the plan' }))
    await user.type(await screen.findByLabelText('Estimate (min)'), '{Enter}')
    expect(store.getState().plans['2025-01-06'].blocks).toHaveLength(1)
  })
})

describe('Plan & Review: leftovers', () => {
  it('pre-picks leftovers from the last planned day; confirm adds the checked ones in old order', async () => {
    const user = userEvent.setup()
    mk('a', 'Alpha')
    mk('b', 'Bravo')
    mk('c', 'Charlie')
    actions.addItemBlock('2026-10-01', 'a', { id: 'x1' })
    actions.addItemBlock('2026-10-01', 'b', { id: 'x2' })
    actions.addItemBlock('2026-10-01', 'c', { id: 'x3' })
    actions.setBlockDone('2026-10-01', 'x2', true)
    render(<App />)
    const group = screen.getByTestId('cand-group-leftovers')
    expect(within(group).getAllByTestId('candidate').map((r) => r.getAttribute('data-item-id'))).toEqual(['a', 'c'])
    await user.click(within(group).getByRole('checkbox', { name: 'Include “Charlie”' }))
    await user.click(within(group).getByRole('button', { name: 'Add selected (1)' }))
    expect(plan().blocks.map((b) => b.itemId)).toEqual(['a'])
    expect(store.getState().items.find((i) => i.id === 'a')!.carryOver).toBe(1)
    expect(within(screen.getByTestId('cand-group-leftovers')).getByText('Charlie')).toBeInTheDocument()
  })
})

describe('Plan & Review: defaults', () => {
  it('opens on a valid day when the URL has no date', () => {
    go('/plan')
    render(<App />)
    expect(screen.getAllByRole('tab').length).toBeGreaterThan(0)
    act(() => undefined)
  })
})
