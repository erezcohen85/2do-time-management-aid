import { test, expect } from './fixtures'

test('app loads the home screen and navigates', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/tasks$/)
  await expect(page.getByRole('heading', { name: 'Task Manager' })).toBeVisible()
  await page.getByTestId('nav-settings').click()
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
})

test('language and theme settings apply and persist across reload', async ({ page }) => {
  await page.goto('/settings')
  await page.getByLabel('Language').click()
  await page.getByRole('option', { name: /עברית/ }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('heading', { name: 'הגדרות', exact: true })).toBeVisible()
})
