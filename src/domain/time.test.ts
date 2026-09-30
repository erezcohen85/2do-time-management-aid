import { addDays, formatDate, fromMin, parseDate, toMin, weekdayOf } from './time'

describe('time', () => {
  it('converts HH:mm and minutes', () => {
    expect(toMin('08:30')).toBe(510)
    expect(fromMin(510)).toBe('08:30')
    expect(fromMin(0)).toBe('00:00')
    expect(toMin(fromMin(1439))).toBe(1439)
  })
  it('adds days across month and DST boundaries', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26')
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30')
  })
  it('knows the weekday', () => {
    expect(weekdayOf('2026-10-01')).toBe(4) // Thursday
    expect(weekdayOf('2026-09-27')).toBe(0)
  })
  it('round-trips dates', () => {
    expect(formatDate(parseDate('2026-01-05'))).toBe('2026-01-05')
  })
})
