import { expect, test } from './fixtures'
import { item, seed } from './helpers'

const pad = (n: number) => String(n).padStart(2, '0')
const d = new Date()
const TODAY = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// keep the review day away from today so no review block is auto-inserted
const db = {
  settings: { review: { weekday: (d.getDay() + 3) % 7 } },
  items: [
    item({ id: 'a', title: 'Alpha', grade: 'A', gradeRank: 1 }),
    item({ id: 'b', title: 'Bravo', grade: 'A', gradeRank: 2 }),
  ],
  plans: {
    [TODAY]: {
      date: TODAY, locked: false, pushed: false,
      blocks: [
        { id: 'ba', kind: 'item', itemId: 'a', rank: 1, estimateMin: 30, done: false },
        { id: 'bb', kind: 'item', itemId: 'b', rank: 2, estimateMin: 30, done: false },
      ],
    },
  },
}

test('tick off blocks and watch the score update', async ({ page }) => {
  await seed(page, db)
  await page.goto('/today')
  await expect(page.getByTestId('today-score')).toHaveText('0/2 done')
  await page.getByRole('checkbox', { name: 'Mark “Alpha” done' }).click()
  await expect(page.getByTestId('today-score')).toHaveText('1/2 done')
  await expect(page.getByTestId('today-badge')).toHaveText('1/2')
  await page.reload()
  await expect(page.getByTestId('today-score')).toHaveText('1/2 done')
})

test('timer runs from a block ▶, shows in the header everywhere, and survives a reload', async ({ page }) => {
  await seed(page, db)
  await page.goto('/today')
  await page.getByRole('button', { name: 'Start a timer on “Bravo”' }).click()
  await expect(page.getByTestId('mini-timer')).toBeVisible()
  await page.getByTestId('nav-settings').click()
  await expect(page.getByTestId('mini-timer-digits')).toHaveText(/^24:5\d$|^25:00$/)
  await page.reload()
  await expect(page.getByTestId('mini-timer-digits')).toHaveText(/^24:[45]\d$|^25:00$/)
  await page.getByTestId('mini-timer').click()
  await expect(page).toHaveURL(/\/today$/)
  await page.getByTestId('timer-pause').click()
  await expect(page.getByTestId('timer-resume')).toBeVisible()
  await page.getByTestId('timer-stop').click()
  await expect(page.getByTestId('mini-timer')).toHaveCount(0)
})
