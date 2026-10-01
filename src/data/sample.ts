import type { Area, DateStr, DayPlan, Db, Item, Project } from '@/types'
import { addDays, formatDate } from '@/domain/time'

type Tr = (key: 'sample.area.work' | 'sample.area.home' | 'sample.project.launch' | 'sample.project.admin' | 'sample.item.copy' | 'sample.item.review' | 'sample.item.bank' | 'sample.item.taxes' | 'sample.item.flights' | 'sample.item.plants' | 'sample.item.passport') => string

export interface Sample {
  areas: Area[]
  projects: Project[]
  items: Item[]
  plans: Record<DateStr, DayPlan>
}

/** A small, realistic starting set so a first-time visitor can click around. Dates are relative to `now`. */
export function buildSample(now: Date, t: Tr): Sample {
  const today = formatDate(now)
  const tomorrow = addDays(today, 1)
  const at = (n: number) => new Date(now.getTime() - (20 - n) * 60000).toISOString()
  const item = (id: string, key: Parameters<Tr>[0], p: Partial<Item>, n: number): Item => ({
    id: `sample-${id}`, projectId: null, parentId: null, title: t(key), grade: null, gradeRank: 0,
    checklist: [], links: [], carryOver: 0, done: false, createdAt: at(n), ...p,
  })
  const items: Item[] = [
    item('copy', 'sample.item.copy', { projectId: 'sample-launch', grade: 'A', gradeRank: 1, estimateMin: 120, due: tomorrow }, 1),
    item('review', 'sample.item.review', { projectId: 'sample-launch', grade: 'B', gradeRank: 1, estimateMin: 60 }, 2),
    item('bank', 'sample.item.bank', { projectId: 'sample-admin', grade: 'A', gradeRank: 2, estimateMin: 20 }, 3),
    item('taxes', 'sample.item.taxes', { projectId: 'sample-admin', grade: 'B', gradeRank: 2, estimateMin: 45, waitingOnId: 'sample-bank' }, 4),
    item('flights', 'sample.item.flights', { areaId: 'sample-home', grade: 'C', gradeRank: 1 }, 5),
    item('plants', 'sample.item.plants', { areaId: 'sample-home' }, 6),
    item('passport', 'sample.item.passport', {}, 7),
  ]
  const block = (id: string, itemId: string, rank: number, estimateMin: number) => ({
    id: `sample-${id}`, kind: 'item' as const, itemId: `sample-${itemId}`, rank, estimateMin, done: false,
  })
  return {
    areas: [
      { id: 'sample-work', name: t('sample.area.work'), order: 1 },
      { id: 'sample-home', name: t('sample.area.home'), order: 2 },
    ],
    projects: [
      { id: 'sample-launch', areaId: 'sample-work', name: t('sample.project.launch'), order: 1, archived: false },
      { id: 'sample-admin', areaId: 'sample-home', name: t('sample.project.admin'), order: 1, archived: false },
    ],
    items,
    plans: {
      [tomorrow]: {
        date: tomorrow, locked: false, pushed: false,
        blocks: [block('b1', 'copy', 1, 120), block('b2', 'bank', 2, 20)],
      },
    },
  }
}

/** Adds sample data only when nothing exists yet, so it can never overwrite real work. */
export function loadSample(db: Db, sample: Sample): Db {
  if (db.areas.length || db.projects.length || db.items.length) return db
  return { ...db, ...sample }
}
