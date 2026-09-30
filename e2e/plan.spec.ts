import { expect, test } from '@playwright/test'
import { item, seed } from './helpers'

const D = '2026-10-02'
const base = {
  items: [
    item({ id: 'a', title: 'Alpha', grade: 'A', gradeRank: 1 }),
    item({ id: 'b', title: 'Bravo', grade: 'A', gradeRank: 2 }),
    item({ id: 'c', title: 'Charlie', grade: 'B', gradeRank: 1 }),
  ],
}

type Page = import('@playwright/test').Page
type Loc = import('@playwright/test').Locator
async function drag(page: Page, fromLoc: Loc, toLoc: Loc) {
  const a = (await fromLoc.boundingBox())!
  const b = (await toLoc.boundingBox())!
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  await page.mouse.move(a.x + a.width / 2 + 5, a.y + a.height / 2 + 5, { steps: 3 })
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 })
  await page.mouse.up()
}

test('drag candidates to the timeline with an estimate prompt, reorder, then drag out to remove', async ({ page }) => {
  await seed(page, base)
  await page.goto(`/plan/${D}`)
  const handle = (id: string) => page.locator(`[data-testid=candidate][data-item-id=${id}] button[aria-label="Drag to reorder"]`)
  const blockHandle = (n: number) => page.getByTestId('plan-block').nth(n).locator('button[aria-label="Drag to reorder"]')
  await drag(page, handle('a'), page.getByTestId('plan-timeline'))
  await page.getByLabel('Estimate (min)').fill('60')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.getByTestId('plan-block')).toHaveCount(1)
  await drag(page, handle('b'), page.getByTestId('plan-block').first())
  await page.getByLabel('Estimate (min)').fill('30')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.getByTestId('plan-block')).toHaveCount(2)
  await expect(page.getByTestId('capacity-footer')).toContainText('2/6')
  // b dropped on top of a: b becomes rank 1
  await expect(page.getByTestId('plan-block').first()).toContainText('Bravo')

  // reorder back
  await drag(page, blockHandle(0), page.getByTestId('plan-block').nth(1))
  await expect(page.getByTestId('plan-block').first()).toContainText('Alpha')

  // drag out onto the candidates pane removes
  await drag(page, blockHandle(0), page.getByTestId('candidates-pane'))
  await expect(page.getByTestId('plan-block')).toHaveCount(1)
  await page.reload()
  await expect(page.getByTestId('plan-block')).toHaveCount(1)
})

test('plan persists per day and the day tab shows the score', async ({ page }) => {
  await seed(page, base)
  await page.goto(`/plan/${D}`)
  await page.getByRole('button', { name: 'Add “Alpha” to the plan' }).click()
  await page.getByLabel('Estimate (min)').fill('30')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('plan-block')).toHaveCount(1)
  await expect(page.getByTestId(`day-score-${D}`)).toHaveText('0/1')
  await page.getByTestId('day-tab-2026-10-03').click()
  await expect(page.getByTestId('plan-block')).toHaveCount(0)
})
