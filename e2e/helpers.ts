import type { Page } from '@playwright/test'

/** Seed `2do.db.v2` once per browser context (survives reloads without being re-applied). */
export async function seed(page: Page, db: Record<string, unknown>) {
  await page.addInitScript((data) => {
    if (sessionStorage.getItem('__seeded')) return
    sessionStorage.setItem('__seeded', '1')
    localStorage.setItem('2do.db.v2', JSON.stringify(data))
  }, db)
}

let n = 0
export const item = (p: Record<string, unknown>) => ({
  id: `i${++n}`, projectId: null, parentId: null, title: 'x', grade: null, gradeRank: 0,
  checklist: [], links: [], carryOver: 0, done: false, createdAt: `2026-09-30T10:${String(n).padStart(2, '0')}:00Z`, ...p,
})
