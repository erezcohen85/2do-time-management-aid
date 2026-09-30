import { displayMs, formatClock } from './format'
import { pause, startTimer, type TimerConfig } from './engine'

const config: TimerConfig = { pomodoro: { workMin: 25, shortBreakMin: 5, longBreakMin: 15, longEvery: 4 } }

describe('format', () => {
  it('formats mm:ss and h:mm:ss', () => {
    expect(formatClock(0)).toBe('00:00')
    expect(formatClock(61_000)).toBe('01:01')
    expect(formatClock(25 * 60_000)).toBe('25:00')
    expect(formatClock(3_725_000)).toBe('1:02:05')
    expect(formatClock(-5)).toBe('00:00')
    expect(formatClock(999)).toBe('00:00')
  })
  it('shows remaining for timed phases and elapsed for the stopwatch', () => {
    const pom = startTimer({ mode: 'pomodoro', config, now: 0, seed: 0 })
    expect(displayMs(pom, 60_000)).toBe(24 * 60_000)
    const sw = pause(startTimer({ mode: 'stopwatch', config, now: 0, seed: 0 }), 90_000)
    expect(displayMs(sw, 10 * 60_000)).toBe(90_000)
  })
})
