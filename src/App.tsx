import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Direction } from 'radix-ui'
import { AppShell } from '@/components/app-shell'
import { useDb } from '@/data/hooks'
import { useI18n } from '@/i18n'
import { I18nProvider } from '@/i18n/provider'
import { Placeholder } from '@/screens/placeholder'
import { SettingsScreen } from '@/screens/settings'
import { TaskManagerScreen } from '@/screens/task-manager'
import { ThemeProvider } from '@/theme/theme-provider'

function Home() {
  const home = useDb((db) => db.settings.homeScreen)
  return <Navigate to={`/${home}`} replace />
}

function Routed() {
  const { dir } = useI18n()
  return (
    <Direction.Provider dir={dir}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/tasks" element={<TaskManagerScreen />} />
          <Route path="/plan/:date?" element={<Placeholder titleKey="nav.plan" />} />
          <Route path="/today" element={<Placeholder titleKey="nav.today" />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </Direction.Provider>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routed />
        </BrowserRouter>
      </ThemeProvider>
    </I18nProvider>
  )
}
