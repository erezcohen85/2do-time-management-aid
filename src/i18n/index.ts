import { createContext, useContext } from 'react'
import { en, type Messages } from './en'
import { he } from './he'

export type Lang = 'en' | 'he'
export type MessageKey = keyof Messages

export const catalogs: Record<Lang, Messages> = { en, he }

/** Replace `{name}` placeholders. */
export function translate(lang: Lang, key: MessageKey, params?: Record<string, string | number>): string {
  const text = catalogs[lang][key] ?? en[key] ?? key
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`))
}

export const dirOf = (lang: Lang) => (lang === 'he' ? 'rtl' : 'ltr')

export interface I18n {
  lang: Lang
  dir: 'ltr' | 'rtl'
  t: (key: MessageKey, params?: Record<string, string | number>) => string
  /** `Intl.DateTimeFormat` for the active language. */
  fmt: (date: Date, opts: Intl.DateTimeFormatOptions) => string
  weekdayName: (weekday: number, style?: 'long' | 'short') => string
  /** 285 -> "4h45" in English, "4 ש׳ 45 דק׳" in Hebrew. */
  duration: (min: number) => string
}

export const I18nContext = createContext<I18n | null>(null)

export function useI18n(): I18n {
  const v = useContext(I18nContext)
  if (!v) throw new Error('useI18n must be used inside <I18nProvider>')
  return v
}
