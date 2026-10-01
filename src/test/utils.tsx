import type { ReactNode } from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { store } from '@/data/store'
import { I18nProvider } from '@/i18n/provider'
import { ThemeProvider } from '@/theme/theme-provider'

export function resetStore() {
  localStorage.clear()
  localStorage.setItem('2do.onboarded', '1')
  store.reload()
}

export function renderApp(ui: ReactNode, route = '/') {
  return render(
    <I18nProvider>
      <ThemeProvider>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </ThemeProvider>
    </I18nProvider>,
  )
}
