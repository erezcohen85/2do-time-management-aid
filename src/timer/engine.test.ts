import {
  advance, elapsedMs, isFocusPhase, isOver, pause, remainingMs, resume, skip, startTimer, type TimerConfig,
} from './engine'

const config: TimerConfig = {
  pomodoro: { workMin: 25, shortBreakMin: 5, longBreakMin: 15, longEvery: 4 },
  preset: { workMin: 52, breakMin: 17 },
  countdownMin: 10,
}
const MIN = 60_000
const T0 = 1_000_000

const start = (mode: Parameters<typeof startTimer>[0]['mode'], extra = {}) =>
  startTimer({ mode, config, now: T0, seed: 7, ...extra })

describe('start', () => {
  it('pomodoro begins with a running work phase', () => {
    const s = start('pomodoro')
    expect(s).toMatchObject({ mode: 'pomodoro', phase: 'work', status: 'running', durationMs: 25 * MIN, cycle: 0 })
    expect(remainingMs(s, T0)).toBe(25 * MIN)
  })
  it('countdown uses its own length, stopwatch has no duration, preset uses its work length', () => {
    expect(start('countdown').durationMs).toBe(10 * MIN)
    expect(start('countdown', { countdownMin: 3 }).durationMs).toBe(3 * MIN)
    const sw = start('stopwatch')
    expect(sw.durationMs).toBeNull()
    expect(remainingMs(sw, T0 + 99)).toBeNull()
    expect(start('preset').durationMs).toBe(52 * MIN)
  })
  it('carries the item tag', () => {
    expect(start('pomodoro', { itemId: 'i1' }).itemId).toBe('i1')
  })
})

describe('elapsed, pause and resume', () => {
  it('counts down while running', () => {
    const s = start('pomodoro')
    expect(elapsedMs(s, T0 + 5 * MIN)).toBe(5 * MIN)
    expect(remainingMs(s, T0 + 5 * MIN)).toBe(20 * MIN)
  })
  it('freezes while paused and continues after resume', () => {
    let s = pause(start('pomodoro'), T0 + 5 * MIN)
    expect(s.status).toBe('paused')
    expect(remainingMs(s, T0 + 60 * MIN)).toBe(20 * MIN)
    s = resume(s, T0 + 60 * MIN)
    expect(remainingMs(s, T0 + 70 * MIN)).toBe(10 * MIN)
  })
  it('pause/resume are no-ops in the wrong state', () => {
    const s = start('pomodoro')
    expect(resume(s, T0 + 1)).toBe(s)
    const p = pause(s, T0 + 1)
    expect(pause(p, T0 + 2)).toBe(p)
  })
  it('stopwatch elapsed survives pause', () => {
    let s = start('stopwatch')
    s = pause(s, T0 + 3 * MIN)
    s = resume(s, T0 + 10 * MIN)
    expect(elapsedMs(s, T0 + 12 * MIN)).toBe(5 * MIN)
  })
})

describe('phase end', () => {
  it('is over only when running and past the duration', () => {
    const s = start('pomodoro')
    expect(isOver(s, T0 + 24 * MIN)).toBe(false)
    expect(isOver(s, T0 + 25 * MIN)).toBe(true)
    expect(isOver(pause(s, T0 + 30 * MIN), T0 + 99 * MIN)).toBe(false)
    expect(isOver(start('stopwatch'), T0 + 999 * MIN)).toBe(false)
  })
  it('advance does nothing before the end', () => {
    const s = start('pomodoro')
    expect(advance(s, T0 + MIN, 1)).toEqual({ state: s, ended: null })
  })
  it('pomodoro: work -> short break (ready, paused) -> work, counting cycles', () => {
    const s = start('pomodoro')
    const r1 = advance(s, T0 + 26 * MIN, 1)
    expect(r1.ended).toMatchObject({ phase: 'work', endedAt: T0 + 25 * MIN, mode: 'pomodoro' })
    expect(r1.state).toMatchObject({ phase: 'shortBreak', status: 'paused', durationMs: 5 * MIN, cycle: 1, elapsedMs: 0 })
    const running = resume(r1.state!, T0 + 30 * MIN)
    const r2 = advance(running, T0 + 36 * MIN, 2)
    expect(r2.ended!.phase).toBe('shortBreak')
    expect(r2.state).toMatchObject({ phase: 'work', status: 'paused', durationMs: 25 * MIN, cycle: 1 })
  })
  it('pomodoro: long break after the configured number of cycles', () => {
    let s = start('pomodoro')
    let t = T0
    for (let i = 0; i < 4; i++) {
      t += 25 * MIN
      const r = advance(s, t, i)
      s = r.state!
      if (i < 3) {
        expect(s.phase).toBe('shortBreak')
        s = resume(s, t)
        t += 5 * MIN
        s = advance(s, t, i).state!
        s = resume(s, t)
      }
    }
    expect(s).toMatchObject({ phase: 'longBreak', durationMs: 15 * MIN, cycle: 4 })
  })
  it('preset alternates its own work and break lengths', () => {
    const r = advance(start('preset'), T0 + 52 * MIN, 1)
    expect(r.state).toMatchObject({ phase: 'shortBreak', durationMs: 17 * MIN })
    const back = advance(resume(r.state!, T0 + 53 * MIN), T0 + 70 * MIN, 1)
    expect(back.state).toMatchObject({ phase: 'work', durationMs: 52 * MIN })
  })
  it('countdown finishes and stays finished', () => {
    const r = advance(start('countdown'), T0 + 11 * MIN, 1)
    expect(r.ended).toMatchObject({ phase: 'countdown', endedAt: T0 + 10 * MIN })
    expect(r.state).toMatchObject({ status: 'finished' })
    expect(advance(r.state!, T0 + 99 * MIN, 1).ended).toBeNull()
  })
  it('catches up after a long absence (tab closed): ends at the true end time', () => {
    const r = advance(start('pomodoro'), T0 + 600 * MIN, 1)
    expect(r.ended!.endedAt).toBe(T0 + 25 * MIN)
  })
})

describe('skip', () => {
  it('skipping a break goes to the next work phase, ready', () => {
    const br = advance(start('pomodoro'), T0 + 25 * MIN, 1).state!
    expect(skip(br, T0 + 26 * MIN, 2)).toMatchObject({ phase: 'work', status: 'paused', cycle: 1 })
  })
  it('skip is a no-op during focus phases', () => {
    const s = start('pomodoro')
    expect(skip(s, T0, 1)).toBe(s)
  })
})

describe('phase helpers', () => {
  it('focus phases are logged, breaks are not', () => {
    expect(isFocusPhase('work')).toBe(true)
    expect(isFocusPhase('countdown')).toBe(true)
    expect(isFocusPhase('stopwatch')).toBe(true)
    expect(isFocusPhase('shortBreak')).toBe(false)
    expect(isFocusPhase('longBreak')).toBe(false)
  })
})
