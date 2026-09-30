import type { TimerState } from '@/timer/engine'

export type Grade = 'A' | 'B' | 'C' | 'D' | 'E'
export const GRADES: Grade[] = ['A', 'B', 'C', 'D', 'E']

/** Local calendar date, `YYYY-MM-DD`. */
export type DateStr = string
/** Wall-clock time, `HH:mm`. */
export type TimeStr = string

export interface Smart {
  specific?: string
  metric?: string
  target?: number
  current?: number
  achievable?: string
  relevant?: string
}

export interface Area {
  id: string
  name: string
  order: number
}

export interface Project {
  id: string
  areaId: string
  name: string
  order: number
  smart?: Smart
  due?: DateStr
  archived: boolean
}

export interface Link {
  id: string
  url: string
  label?: string
}

export interface ChecklistEntry {
  id: string
  text: string
  done: boolean
}

/** Task (`parentId === null`) or subtask (`parentId` = task id). */
export interface Item {
  id: string
  projectId: string | null
  parentId: string | null
  title: string
  notes?: string
  grade: Grade | null
  /** Rank within grade, global across projects (lower first). */
  gradeRank: number
  estimateMin?: number
  due?: DateStr
  smart?: Smart
  checklist: ChecklistEntry[]
  links: Link[]
  waitingOnId?: string
  carryOver: number
  done: boolean
  doneAt?: string
  createdAt: string
}

export interface Block {
  id: string
  kind: 'item' | 'review'
  itemId?: string
  rank: number
  estimateMin: number
  pinnedStart?: TimeStr
  done: boolean
  gcalEventId?: string
  /** Signature (title, start, end) last pushed to Google Calendar. */
  gcalSig?: string
}

export interface DayPlan {
  date: DateStr
  blocks: Block[]
  locked: boolean
  pushed: boolean
  /** Calendar events of removed blocks, waiting to be deleted on the next sync. */
  orphanedEventIds?: string[]
}

export type TimerMode = 'pomodoro' | 'countdown' | 'stopwatch' | 'preset'

export interface TimerSession {
  id: string
  mode: TimerMode
  start: string
  end?: string
  itemId?: string
}

export interface WeeklyReview {
  weekStart: DateStr
  projectNotes: Record<string, string>
  wentWell?: string
  slipped?: string
  nextFocus?: string
  completedAt?: string
  /** The review block was auto-inserted for this week (do not insert again). */
  blockInserted?: boolean
}

export type Screen = 'tasks' | 'plan' | 'today' | 'settings'

export interface TimerPreset {
  id: string
  name: string
  workMin: number
  breakMin: number
}

export interface Settings {
  homeScreen: Screen
  ivyCap: 'hard' | 'soft'
  ivyOrder: 'hard' | 'soft'
  ritual: { mode: 'evening' | 'morning' | 'anytime'; time: TimeStr; reminder: boolean }
  review: { weekday: number; time: TimeStr; estimateMin: number }
  /** 0 = Sunday … 6 = Saturday. */
  weekStart: number
  /** Weekday indexes shown as day tabs, in display order starting at `weekStart`. */
  visibleDays: number[]
  dayStart: TimeStr
  overflowAfter: TimeStr
  defaultEstimateMin: number
  gcal: {
    readCalendarIds: string[]
    targetCalendarId?: string
    syncMode: 'auto' | 'manual'
  }
  timer: {
    pomodoro: { workMin: number; shortBreakMin: number; longBreakMin: number; longEvery: number }
    presets: TimerPreset[]
    sound: boolean
    notify: boolean
  }
  theme: 'light' | 'dark' | 'system'
  language: 'en' | 'he'
}

export interface Db {
  version: 2
  areas: Area[]
  projects: Project[]
  items: Item[]
  plans: Record<DateStr, DayPlan>
  sessions: TimerSession[]
  reviews: Record<DateStr, WeeklyReview>
  settings: Settings
  /** Persisted timer state machine (see `timer/engine.ts`). */
  timer: TimerState | null
}

export const IVY_CAP = 6
