import type { GEvent } from './types'
import { toCalendarEvents } from './events'

// Times below are built in local time so the tests hold in any timezone.
const local = (d: string, hm: string) => new Date(`${d}T${hm}:00`).toISOString()
const ev = (id: string, start: string, end: string, extra: Partial<GEvent> = {}): GEvent => ({
  id, summary: id, start: { dateTime: start }, end: { dateTime: end }, ...extra,
})
const D = '2026-10-01'

describe('toCalendarEvents', () => {
  it('maps timed events to local HH:mm', () => {
    const r = toCalendarEvents([ev('standup', local(D, '11:15'), local(D, '11:45'))], D)
    expect(r).toEqual([{ id: 'standup', title: 'standup', start: '11:15', end: '11:45' }])
  })
  it('skips all-day, cancelled and free (transparent) events', () => {
    const r = toCalendarEvents(
      [
        { id: 'allday', summary: 'Holiday', start: { date: D }, end: { date: '2026-10-02' } },
        ev('gone', local(D, '09:00'), local(D, '10:00'), { status: 'cancelled' }),
        ev('free', local(D, '09:00'), local(D, '10:00'), { transparency: 'transparent' }),
        ev('busy', local(D, '12:00'), local(D, '13:00')),
      ],
      D,
    )
    expect(r.map((e) => e.id)).toEqual(['busy'])
  })
  it('clamps events that cross midnight and drops events on other days', () => {
    const r = toCalendarEvents(
      [
        ev('late', local(D, '23:00'), local('2026-10-02', '01:00')),
        ev('early', local('2026-09-30', '22:00'), local(D, '01:30')),
        ev('other', local('2026-10-02', '09:00'), local('2026-10-02', '10:00')),
      ],
      D,
    )
    expect(r).toEqual([
      { id: 'early', title: 'early', start: '00:00', end: '01:30' },
      { id: 'late', title: 'late', start: '23:00', end: '24:00' },
    ])
  })
  it('sorts by start and titles untitled events', () => {
    const r = toCalendarEvents([ev('b', local(D, '10:00'), local(D, '11:00'), { summary: undefined }), ev('a', local(D, '09:00'), local(D, '09:30'))], D)
    expect(r.map((e) => e.start)).toEqual(['09:00', '10:00'])
    expect(r[1].title).toBe('(no title)')
  })
  it('ignores zero-length events', () => {
    expect(toCalendarEvents([ev('z', local(D, '09:00'), local(D, '09:00'))], D)).toEqual([])
  })
})
