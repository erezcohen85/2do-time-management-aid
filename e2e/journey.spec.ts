import { expect, test } from '@playwright/test'

test('capture → grade → plan tomorrow → tick on Today → Thursday review', async ({ page }) => {
  // Wednesday evening, after the 21:00 ritual time
  await page.clock.setFixedTime(new Date('2026-09-30T21:30:00'))
  await page.goto('/tasks')
  for (const title of ['Landing copy', 'Call accountant']) {
    await page.keyboard.press('Control+Shift+A')
    await page.getByPlaceholder('What needs doing?').fill(title)
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog')).toBeHidden()
  }
  const inbox = page.getByTestId('ungraded-inbox')
  await inbox.getByRole('radio', { name: /Grade A/ }).first().click()
  await inbox.getByRole('radio', { name: /Grade A/ }).first().click()
  await expect(page.getByTestId('grade-group-A').getByTestId('item-row')).toHaveCount(2)

  await page.getByTestId('ritual-banner').getByRole('button', { name: 'Open planning' }).click()
  await expect(page).toHaveURL(/\/plan\/2026-10-01$/)
  await expect(page.getByTestId('plan-block').first()).toContainText('Weekly review')
  for (const title of ['Landing copy', 'Call accountant']) {
    await page.getByRole('button', { name: `Add “${title}” to the plan` }).click()
    await page.getByLabel('Estimate (min)').fill('30')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog')).toBeHidden()
  }
  await expect(page.getByTestId('capacity-count')).toHaveText('3/6')

  // Thursday morning
  await page.clock.setFixedTime(new Date('2026-10-01T09:00:00'))
  await page.goto('/today')
  await page.getByRole('checkbox', { name: 'Mark “Weekly review” done' }).click()
  await page.getByRole('checkbox', { name: 'Mark “Landing copy” done' }).click()
  await expect(page.getByTestId('today-score')).toHaveText('2/3 done')

  await page.goto('/plan/2026-10-01')
  await page.getByLabel('What went well').fill('Shipped the plan')
  await page.getByLabel('What slipped').click()
  await expect(page.getByTestId('review-panel')).toBeVisible()
  await expect(page.getByTestId('review-grade-A')).toContainText('1')
})
