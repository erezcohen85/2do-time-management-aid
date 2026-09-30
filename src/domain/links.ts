export type LinkProvider =
  | 'google-docs' | 'google-sheets' | 'google-slides' | 'google-drive' | 'gmail' | 'notion'
  | 'github' | 'figma' | 'youtube' | 'slack' | 'zoom' | 'web'

/** Accept bare domains; returns null when the text is not a usable URL. */
export function normalizeUrl(input: string): string | null {
  const text = input.trim()
  if (!text || /\s/.test(text)) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`
  try {
    const u = new URL(withScheme)
    if (!u.hostname.includes('.')) return null
    return withScheme
  } catch {
    return null
  }
}

export function detectLink(url: string): { provider: LinkProvider; label: string } {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return { provider: 'web', label: url }
  }
  const host = u.hostname.replace(/^www\./, '')
  const path = u.pathname
  const is = (d: string) => host === d || host.endsWith(`.${d}`)
  if (host === 'docs.google.com') {
    if (path.startsWith('/spreadsheets')) return { provider: 'google-sheets', label: 'Google Sheets' }
    if (path.startsWith('/presentation')) return { provider: 'google-slides', label: 'Google Slides' }
    return { provider: 'google-docs', label: 'Google Docs' }
  }
  if (host === 'drive.google.com') return { provider: 'google-drive', label: 'Google Drive' }
  if (host === 'mail.google.com') return { provider: 'gmail', label: 'Gmail' }
  if (is('notion.so') || is('notion.site')) return { provider: 'notion', label: 'Notion' }
  if (is('github.com')) return { provider: 'github', label: 'GitHub' }
  if (is('figma.com')) return { provider: 'figma', label: 'Figma' }
  if (is('youtube.com') || host === 'youtu.be') return { provider: 'youtube', label: 'YouTube' }
  if (is('slack.com')) return { provider: 'slack', label: 'Slack' }
  if (is('zoom.us')) return { provider: 'zoom', label: 'Zoom' }
  return { provider: 'web', label: host }
}
