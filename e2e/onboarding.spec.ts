import { expect, test } from './fixtures'

test.use({ onboarded: false })

test('a first-time visitor gets the tour and can explore with sample data', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('tour')).toBeVisible()
  for (let i = 0; i < 4; i++) await page.getByTestId('tour-next').click()
  await page.getByTestId('tour-sample').click()
  await expect(page.getByTestId('tour')).toBeHidden()
  await expect(page.getByTestId('ungraded-inbox').getByText('Renew passport')).toBeVisible()
  await page.getByTestId('nav-plan').click()
  await page.getByRole('button', { name: 'Next week' }).waitFor()
  await page.reload()
  await expect(page.getByTestId('tour')).toHaveCount(0)
})
