import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/App'
import { actions, makeItem } from '@/data/actions'
import { store } from '@/data/store'
import { resetStore } from '@/test/utils'

const go = (p: string) => window.history.pushState({}, '', p)

beforeEach(() => {
  resetStore()
  localStorage.removeItem('2do.onboarded')
  go('/tasks')
})

describe('first-run tour', () => {
  it('opens on a fresh install, walks the five steps, and can load sample data', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(await screen.findByTestId('tour')).toHaveTextContent('Welcome to 2DO')
    for (const title of ['1. Capture and grade', '2. Plan tomorrow', '3. Run the day', '4. Review the week']) {
      await user.click(screen.getByTestId('tour-next'))
      expect(screen.getByTestId('tour')).toHaveTextContent(title)
    }
    expect(screen.getByTestId('tour-progress')).toHaveTextContent('Step 5 of 5')
    await user.click(screen.getByTestId('tour-sample'))
    expect(store.getState().items.length).toBeGreaterThan(3)
    expect(Object.values(store.getState().plans)[0].blocks).toHaveLength(2)
    expect(screen.queryByTestId('tour')).not.toBeInTheDocument()
    expect(localStorage.getItem('2do.onboarded')).toBe('1')
  })

  it('"Start empty" leaves the app empty and does not come back', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    for (let i = 0; i < 4; i++) await user.click(await screen.findByTestId('tour-next'))
    await user.click(screen.getByTestId('tour-empty'))
    expect(store.getState().items).toEqual([])
    unmount()
    render(<App />)
    expect(screen.queryByTestId('tour')).not.toBeInTheDocument()
  })

  it('skip closes it for good', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByTestId('tour-skip'))
    expect(screen.queryByTestId('tour')).not.toBeInTheDocument()
    expect(localStorage.getItem('2do.onboarded')).toBe('1')
  })

  it('does not appear for someone who already has data', () => {
    actions.addItem(makeItem({ id: 'x', title: 'Existing' }))
    render(<App />)
    expect(screen.queryByTestId('tour')).not.toBeInTheDocument()
  })

  it('can be replayed from Settings and never offers sample data over real work', async () => {
    const user = userEvent.setup()
    localStorage.setItem('2do.onboarded', '1')
    actions.addItem(makeItem({ id: 'x', title: 'Existing' }))
    go('/settings')
    render(<App />)
    await user.click(await screen.findByTestId('show-tour'))
    for (let i = 0; i < 4; i++) await user.click(await screen.findByTestId('tour-next'))
    expect(screen.queryByTestId('tour-sample')).not.toBeInTheDocument()
    await user.click(screen.getByTestId('tour-done'))
    expect(store.getState().items).toHaveLength(1)
  })

  it('renders in Hebrew and loads Hebrew sample titles', async () => {
    const user = userEvent.setup()
    actions.updateSettings({ language: 'he' })
    render(<App />)
    expect(await screen.findByTestId('tour')).toHaveTextContent('ברוכים הבאים')
    for (let i = 0; i < 4; i++) await user.click(screen.getByTestId('tour-next'))
    await user.click(screen.getByTestId('tour-sample'))
    expect(store.getState().areas[0].name).toBe('עבודה')
  })
})
