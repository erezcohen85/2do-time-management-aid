import { test as base, expect } from '@playwright/test'

/** `onboarded` defaults to true so the first-run tour does not cover every test. */
export const test = base.extend<{ onboarded: boolean }>({
  onboarded: [true, { option: true }],
  page: async ({ page, onboarded }, use) => {
    if (onboarded) await page.addInitScript(() => localStorage.setItem('2do.onboarded', '1'))
    await use(page)
  },
})
export { expect }
