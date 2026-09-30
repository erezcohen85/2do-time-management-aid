import { detectLink, normalizeUrl } from './links'

describe('links', () => {
  it('normalizes bare domains to https', () => {
    expect(normalizeUrl('example.com/a')).toBe('https://example.com/a')
    expect(normalizeUrl(' https://x.io ')).toBe('https://x.io')
    expect(normalizeUrl('')).toBeNull()
    expect(normalizeUrl('not a url')).toBeNull()
  })
  it('detects providers', () => {
    expect(detectLink('https://docs.google.com/document/d/1').provider).toBe('google-docs')
    expect(detectLink('https://docs.google.com/spreadsheets/d/1').provider).toBe('google-sheets')
    expect(detectLink('https://drive.google.com/file/d/1').provider).toBe('google-drive')
    expect(detectLink('https://www.notion.so/page').provider).toBe('notion')
    expect(detectLink('https://github.com/a/b').provider).toBe('github')
    expect(detectLink('https://www.figma.com/file/x').provider).toBe('figma')
    expect(detectLink('https://youtu.be/abc').provider).toBe('youtube')
    expect(detectLink('https://mail.google.com/mail/u/0').provider).toBe('gmail')
    expect(detectLink('https://acme.slack.com/archives/C1').provider).toBe('slack')
    expect(detectLink('https://us02web.zoom.us/j/1').provider).toBe('zoom')
  })
  it('falls back to the bare hostname', () => {
    expect(detectLink('https://www.example.org/x')).toEqual({ provider: 'web', label: 'example.org' })
  })
})
