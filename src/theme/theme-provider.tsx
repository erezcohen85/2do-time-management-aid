import { useEffect, type ReactNode } from 'react'
import { useDb } from '@/data/hooks'

/** Mirrors the theme setting onto `<html class="dark">`; `system` follows the OS. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useDb((db) => db.settings.theme)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches)
      document.documentElement.classList.toggle('dark', dark)
    }
    apply()
    if (theme !== 'system') return
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])

  return <>{children}</>
}
