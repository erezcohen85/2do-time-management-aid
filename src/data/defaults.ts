import type { Db, Settings } from '@/types'

export const DEFAULT_SETTINGS: Settings = {
  homeScreen: 'tasks',
  ivyCap: 'hard',
  ivyOrder: 'soft',
  ritual: { mode: 'evening', time: '21:00', reminder: true },
  review: { weekday: 4, time: '08:30', estimateMin: 45 },
  weekStart: 0,
  visibleDays: [0, 1, 2, 3, 4, 5, 6],
  dayStart: '08:30',
  overflowAfter: '22:00',
  defaultEstimateMin: 30,
  gcal: { readCalendarIds: [], syncMode: 'auto' },
  timer: {
    pomodoro: { workMin: 25, shortBreakMin: 5, longBreakMin: 15, longEvery: 4 },
    presets: [
      { id: 'preset-52-17', name: '52 / 17', workMin: 52, breakMin: 17 },
      { id: 'preset-90-20', name: '90 / 20', workMin: 90, breakMin: 20 },
    ],
    sound: true,
    notify: true,
  },
  theme: 'system',
  language: 'en',
}

export function emptyDb(): Db {
  return {
    version: 2,
    areas: [],
    projects: [],
    items: [],
    plans: {},
    sessions: [],
    reviews: {},
    settings: structuredClone(DEFAULT_SETTINGS),
    timer: null,
  }
}
