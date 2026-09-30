import { useCallback, useEffect, useMemo, type ReactNode } from 'react'
import { useDb } from '@/data/hooks'
import { dirOf, I18nContext, translate, type I18n } from '.'

export function I18nProvider({ children }: { children: ReactNode }) {
  const lang = useDb((db) => db.settings.language)
  const dir = dirOf(lang)

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = dir
  }, [lang, dir])

  const t = useCallback<I18n['t']>((key, params) => translate(lang, key, params), [lang])
  const value = useMemo<I18n>(() => {
    const fmt: I18n['fmt'] = (date, opts) => new Intl.DateTimeFormat(lang, opts).format(date)
    return {
      lang,
      dir,
      t,
      fmt,
      // 2026-01-04 is a Sunday
      weekdayName: (w, style = 'long') => fmt(new Date(2026, 0, 4 + w, 12), { weekday: style }),
    }
  }, [lang, dir, t])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

