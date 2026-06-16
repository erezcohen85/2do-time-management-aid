import type { LinkProvider } from '@/types'

// tiny classnames helper
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function nowISO(): string {
  return new Date().toISOString()
}

// ───────────────────────── link provider detection ─────────────────────────
export function detectProvider(rawUrl: string): LinkProvider {
  let host = ''
  let path = ''
  try {
    const u = new URL(rawUrl)
    host = u.hostname.toLowerCase()
    path = u.pathname.toLowerCase()
  } catch {
    return 'web'
  }

  if (host.includes('docs.google.com')) {
    if (path.startsWith('/document')) return 'gdoc'
    if (path.startsWith('/spreadsheets')) return 'gsheet'
    if (path.startsWith('/presentation')) return 'gslides'
    if (path.startsWith('/forms')) return 'gform'
    return 'gdoc'
  }
  if (host.includes('forms.gle')) return 'gform'
  if (host.includes('drive.google.com')) return 'gdrive'
  if (host.includes('sheets.google.com')) return 'gsheet'
  return 'web'
}

export const PROVIDER_META: Record<
  LinkProvider,
  { label: string; color: string; bg: string }
> = {
  gdoc: { label: 'Google Doc', color: '#2563eb', bg: '#e8f0fe' },
  gsheet: { label: 'Google Sheet', color: '#15803d', bg: '#e6f4ea' },
  gslides: { label: 'Google Slides', color: '#d97706', bg: '#fef3e2' },
  gform: { label: 'Google Form', color: '#7c3aed', bg: '#f3e8ff' },
  gdrive: { label: 'Google Drive', color: '#4f46e5', bg: '#eef2ff' },
  web: { label: 'Link', color: '#555066', bg: '#f3f3f5' },
}

export function prettyUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace(/^www\./, '') + (u.pathname === '/' ? '' : u.pathname)
  } catch {
    return url
  }
}

export function normalizeUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return trimmed
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return 'https://' + trimmed
}

// preset palette for area dots
export const AREA_COLORS = [
  '#4f46e5',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#8b5cf6',
  '#14b8a6',
]
