import { expect, test } from '@playwright/test'
import { item, seed } from './helpers'

test('capture with quick add, grade in one click, open detail', async ({ page }) => {
  await page.goto('/tasks')
  await page.keyboard.press('Control+Shift+A')
  await page.getByPlaceholder('What needs doing?').fill('Call bank')
  await page.keyboard.press('Enter')
  const inbox = page.getByTestId('ungraded-inbox')
  await expect(inbox.getByText('Call bank')).toBeVisible()
  await inbox.getByRole('radio', { name: /Grade A/ }).click()
  await expect(page.getByTestId('grade-group-A').getByTestId('rank')).toHaveText('A1')
  await page.getByTestId('grade-group-A').getByText('Call bank').click()
  await expect(page.getByTestId('item-detail')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('item-detail')).toBeHidden()
})

test('drag to rank within a grade, and across grades', async ({ page }) => {
  await seed(page, {
    items: [
      item({ id: 'a1', title: 'First', grade: 'A', gradeRank: 1 }),
      item({ id: 'a2', title: 'Second', grade: 'A', gradeRank: 2 }),
      item({ id: 'b1', title: 'Bee', grade: 'B', gradeRank: 1 }),
    ],
  })
  await page.goto('/tasks')
  const groupA = page.getByTestId('grade-group-A')
  const order = () => groupA.getByTestId('item-row').evaluateAll((els) => els.map((e) => e.getAttribute('data-item-id')))
  expect(await order()).toEqual(['a1', 'a2'])

  const handle = (id: string) => page.locator(`[data-item-id="${id}"] button[aria-label="Drag to rank"]`)
  const drag = async (from: string, to: string, below = false) => {
    const a = (await handle(from).boundingBox())!
    const b = (await page.locator(`[data-item-id="${to}"]`).boundingBox())!
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
    await page.mouse.down()
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2 + 10, { steps: 3 })
    await page.mouse.move(b.x + 40, b.y + b.height / 2 + (below ? 8 : -8), { steps: 10 })
    await page.mouse.up()
  }
  await drag('a2', 'a1')
  await expect.poll(order).toEqual(['a2', 'a1'])
  await expect(groupA.getByTestId('rank').first()).toHaveText('A1')

  await drag('b1', 'a2')
  await expect.poll(async () => groupA.getByTestId('item-row').count()).toBe(3)
  await page.reload()
  await expect(page.getByTestId('grade-group-A').getByTestId('item-row')).toHaveCount(3)
})

test('search with ctrl+k opens the matching task', async ({ page }) => {
  await seed(page, { items: [item({ id: 's1', title: 'Renew passport' }), item({ id: 's2', title: 'Buy milk' })] })
  await page.goto('/tasks')
  await page.keyboard.press('Control+k')
  await page.getByPlaceholder('Search tasks and projects…').fill('pass')
  await page.getByRole('option', { name: /Renew passport/ }).click()
  await expect(page).toHaveURL(/item=s1/)
  await expect(page.getByLabel('Title')).toHaveValue('Renew passport')
})
