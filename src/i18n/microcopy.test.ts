import { pickLine, pools, type PoolKey } from './microcopy'

const KEYS: PoolKey[] = ['start', 'running', 'break', 'end', 'stopwatch']

describe('microcopy pools', () => {
  it('both languages have every pool, each with several non-empty, unique lines', () => {
    for (const lang of ['en', 'he'] as const) {
      for (const k of KEYS) {
        const lines = pools[lang][k]
        expect(lines.length, `${lang}.${k}`).toBeGreaterThanOrEqual(5)
        expect(new Set(lines).size).toBe(lines.length)
        lines.forEach((l) => expect(l.trim()).not.toBe(''))
      }
    }
  })
  it('picks deterministically and rotates', () => {
    expect(pickLine('en', 'start', 7)).toBe(pickLine('en', 'start', 7))
    expect(pickLine('en', 'running', 0, 0)).not.toBe(pickLine('en', 'running', 0, 1))
    expect(pickLine('en', 'end', 5)).toBe(pools.en.end[0])
    expect(pickLine('he', 'break', 1.9, 0.2)).toBe(pools.he.break[1])
  })
})
