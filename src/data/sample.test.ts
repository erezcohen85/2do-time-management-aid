import { emptyDb } from './defaults'
import { buildSample, loadSample } from './sample'
import { translate } from '@/i18n'
import { isPlannable } from '@/domain/items'

const now = new Date(2026, 9, 1, 12)
const sample = buildSample(now, (k) => translate('en', k))

describe('sample data', () => {
  it('is internally consistent and plannable', () => {
    const ids = new Set(sample.items.map((i) => i.id))
    expect(ids.size).toBe(sample.items.length)
    for (const i of sample.items) {
      if (i.projectId) expect(sample.projects.some((p) => p.id === i.projectId)).toBe(true)
      if (i.areaId) expect(sample.areas.some((a) => a.id === i.areaId)).toBe(true)
      if (i.waitingOnId) expect(ids.has(i.waitingOnId)).toBe(true)
    }
    const plan = sample.plans['2026-10-02']
    expect(plan.blocks).toHaveLength(2)
    for (const b of plan.blocks) expect(isPlannable(sample.items.find((i) => i.id === b.itemId)!, sample.items)).toBe(true)
  })
  it('has ungraded, graded and area-only items', () => {
    expect(sample.items.some((i) => i.grade === null)).toBe(true)
    expect(sample.items.some((i) => i.grade === 'A')).toBe(true)
    expect(sample.items.some((i) => i.projectId === null && i.areaId)).toBe(true)
  })
  it('only loads into an empty db', () => {
    expect(loadSample(emptyDb(), sample).items).toHaveLength(sample.items.length)
    const used = { ...emptyDb(), items: [sample.items[0]] }
    expect(loadSample(used, sample)).toBe(used)
  })
  it('is translated in Hebrew', () => {
    const he = buildSample(now, (k) => translate('he', k))
    expect(he.items[0].title).not.toBe(sample.items[0].title)
  })
})
