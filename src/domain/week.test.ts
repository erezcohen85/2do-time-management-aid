import { defaultPlanDate, flipWeek, isoWeekNumber, orderDays, visibleDates, weekDates, weekStartOf } from './week'

describe('week math', () => {
  it('finds the week start for any weekday start', () => {
    expect(weekStartOf('2026-10-01', 0)).toBe('2026-09-27') // Thu -> Sun
    expect(weekStartOf('2026-09-27', 0)).toBe('2026-09-27')
    expect(weekStartOf('2026-10-01', 1)).toBe('2026-09-28') // Monday start
    expect(weekStartOf('2026-09-27', 1)).toBe('2026-09-21') // Sunday belongs to previous Mon-week
    expect(weekStartOf('2026-10-01', 6)).toBe('2026-09-26') // Saturday start
  })
  it('lists the 7 dates of a week', () => {
    expect(weekDates('2026-09-27')).toEqual([
      '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03',
    ])
  })
  it('flips endlessly in both directions', () => {
    expect(flipWeek('2026-09-27', 1)).toBe('2026-10-04')
    expect(flipWeek('2026-09-27', -1)).toBe('2026-09-20')
    expect(flipWeek('2026-09-27', 52)).toBe('2027-09-26')
  })
  it('filters to visible weekdays in display order', () => {
    // Mon-Fri, Monday start
    expect(visibleDates('2026-09-28', [1, 2, 3, 4, 5])).toEqual([
      '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02',
    ])
  })
  it('computes the ISO week number of the week (Sun start -> Wed)', () => {
    expect(isoWeekNumber('2026-09-27')).toBe(40)
    expect(isoWeekNumber('2026-12-27')).toBe(53)
    expect(isoWeekNumber('2027-01-03')).toBe(1)
  })
})

describe('orderDays', () => {
  it('sorts weekday indexes from the week start and dedupes', () => {
    expect(orderDays([0, 5, 1, 1], 1)).toEqual([1, 5, 0])
    expect(orderDays([6, 0, 3], 0)).toEqual([0, 3, 6])
    expect(orderDays([0, 6], 6)).toEqual([6, 0])
  })
})

describe('defaultPlanDate', () => {
  const at = (h: number, m = 0) => new Date(2026, 9, 1, h, m)
  it('evening mode lands on tomorrow after the ritual time, today before', () => {
    expect(defaultPlanDate(at(21, 30), { mode: 'evening', time: '21:00' })).toBe('2026-10-02')
    expect(defaultPlanDate(at(21, 0), { mode: 'evening', time: '21:00' })).toBe('2026-10-02')
    expect(defaultPlanDate(at(20, 59), { mode: 'evening', time: '21:00' })).toBe('2026-10-01')
  })
  it('morning and anytime land on today', () => {
    expect(defaultPlanDate(at(23), { mode: 'morning', time: '07:00' })).toBe('2026-10-01')
    expect(defaultPlanDate(at(23), { mode: 'anytime', time: '07:00' })).toBe('2026-10-01')
  })
})
