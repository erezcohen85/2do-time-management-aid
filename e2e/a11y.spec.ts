import AxeBuilder from '@axe-core/playwright'
import { expect, test } from './fixtures'
import { item, seed } from './helpers'

const db = (language: string, theme: string) => ({
  settings: { language, theme },
  areas: [{ id: 'a1', name: 'Home', order: 1 }],
  projects: [{ id: 'p1', areaId: 'a1', name: 'Admin', order: 1, archived: false }],
  items: [
    item({ id: 'a', title: 'Alpha', grade: 'A', gradeRank: 1, projectId: 'p1' }),
    item({ id: 'u', title: 'Ungraded' }),
  ],
})

for (const [language, theme] of [['en', 'light'], ['he', 'dark']] as const) {
  for (const path of ['/tasks', '/plan/2026-10-02', '/today', '/settings']) {
    test(`no serious a11y violations: ${path} (${language}/${theme})`, async ({ page }) => {
      await seed(page, db(language, theme))
      await page.goto(path)
      await page.waitForTimeout(500)
      const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
      const bad = res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
      expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([])
    })
  }
}
