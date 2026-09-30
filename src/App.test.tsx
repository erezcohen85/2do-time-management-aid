import { act, render, screen } from '@testing-library/react'
import App from './App'
import { actions } from '@/data/actions'
import { resetStore } from '@/test/utils'

beforeEach(() => {
  resetStore()
  window.history.pushState({}, '', '/')
})

describe('App shell', () => {
  it('redirects / to the home screen setting and shows the four nav items', () => {
    render(<App />)
    expect(window.location.pathname).toBe('/tasks')
    for (const id of ['tasks', 'plan', 'today', 'settings']) {
      expect(screen.getByTestId(`nav-${id}`)).toBeInTheDocument()
    }
    expect(screen.getByRole('heading', { name: 'Task Manager' })).toBeInTheDocument()
  })

  it('honours a different home screen', () => {
    actions.updateSettings({ homeScreen: 'today' })
    render(<App />)
    expect(window.location.pathname).toBe('/today')
  })

  it('switches to Hebrew with rtl direction and translated nav', () => {
    render(<App />)
    act(() => actions.updateSettings({ language: 'he' }))
    expect(document.documentElement.dir).toBe('rtl')
    expect(document.documentElement.lang).toBe('he')
    expect(screen.getByTestId('nav-settings')).toHaveTextContent('הגדרות')
  })

  it('applies dark theme class, and follows the system when set to system', () => {
    render(<App />)
    act(() => actions.updateSettings({ theme: 'dark' }))
    expect(document.documentElement).toHaveClass('dark')
    act(() => actions.updateSettings({ theme: 'light' }))
    expect(document.documentElement).not.toHaveClass('dark')
  })
})
