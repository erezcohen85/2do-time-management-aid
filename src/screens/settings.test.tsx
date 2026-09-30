import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsScreen } from './settings'
import { store } from '@/data/store'
import { actions } from '@/data/actions'
import { STORAGE_KEY } from '@/data/persistence'
import { renderApp, resetStore } from '@/test/utils'

beforeEach(resetStore)

const settings = () => store.getState().settings

describe('SettingsScreen', () => {
  it('shows defaults from spec §5.5', () => {
    renderApp(<SettingsScreen />)
    expect(screen.getByLabelText('Default estimate (min)')).toHaveValue(30)
    expect(screen.getByLabelText('Day start time')).toHaveValue('08:30')
    expect(screen.getByLabelText('Reminder time')).toHaveValue('21:00')
    expect(screen.getByLabelText('Review time')).toHaveValue('08:30')
    expect(screen.getByLabelText('Work (min)')).toHaveValue(25)
    expect(screen.getByLabelText('Long break after')).toHaveValue(4)
  })

  it('persists number and time edits', async () => {
    const user = userEvent.setup()
    renderApp(<SettingsScreen />)
    const est = screen.getByLabelText('Default estimate (min)')
    await user.clear(est)
    await user.type(est, '45')
    expect(settings().defaultEstimateMin).toBe(45)
    const work = screen.getByLabelText('Work (min)')
    await user.clear(work)
    await user.type(work, '50')
    expect(settings().timer.pomodoro.workMin).toBe(50)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).settings.timer.pomodoro.workMin).toBe(50)
  })

  it('ignores out-of-range numbers', async () => {
    const user = userEvent.setup()
    renderApp(<SettingsScreen />)
    const est = screen.getByLabelText('Default estimate (min)')
    await user.clear(est)
    await user.type(est, '1')
    expect(settings().defaultEstimateMin).toBe(30)
  })

  it('toggles switches and hides ritual fields for "anytime"', async () => {
    const user = userEvent.setup()
    renderApp(<SettingsScreen />)
    await user.click(screen.getByLabelText('Play a sound when a phase ends'))
    expect(settings().timer.sound).toBe(false)
    act(() => actions.updateSettings({ ritual: { mode: 'anytime' } }))
    expect(screen.queryByLabelText('Reminder time')).not.toBeInTheDocument()
  })

  it('adds and removes timer presets', async () => {
    const user = userEvent.setup()
    renderApp(<SettingsScreen />)
    expect(screen.getAllByTestId('preset-row')).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: /Add preset/ }))
    expect(settings().timer.presets).toHaveLength(3)
    const rows = screen.getAllByTestId('preset-row')
    await user.click(within(rows[0]).getByRole('button', { name: 'Remove' }))
    expect(settings().timer.presets).toHaveLength(2)
  })

  it('keeps visible days ordered from the week start and at least one selected', async () => {
    const user = userEvent.setup()
    renderApp(<SettingsScreen />)
    await user.click(screen.getByRole('button', { name: 'Saturday' }))
    await user.click(screen.getByRole('button', { name: 'Friday' }))
    expect(settings().visibleDays).toEqual([0, 1, 2, 3, 4])
    act(() => actions.updateSettings({ weekStart: 1 }))
    expect(settings().weekStart).toBe(1)
  })

  it('renders in Hebrew', () => {
    actions.updateSettings({ language: 'he' })
    renderApp(<SettingsScreen />)
    expect(screen.getByRole('heading', { name: 'הגדרות' })).toBeInTheDocument()
  })
})
