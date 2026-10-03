import { emptyDb } from '@/data/defaults'
import { makeItem } from '@/data/mutations'
import type { Db } from '@/types'
import { buildCsv, csvCell, parseCsv } from './export'

const base = (): Db => ({
  ...emptyDb(),
  areas: [{ id: 'a1', name: 'Work', order: 1 }, { id: 'a2', name: 'Home', order: 2 }],
  projects: [
    { id: 'p1', areaId: 'a1', name: 'Launch', order: 1, archived: false, smart: { metric: 'milestones', target: 5, current: 3 }, due: '2026-12-01' },
    { id: 'p2', areaId: 'a1', name: 'Empty', order: 2, archived: true },
  ],
  items: [
    makeItem({ id: 't1', title: 'Write copy, "v1"', projectId: 'p1', grade: 'A', gradeRank: 1, estimateMin: 90, due: '2026-10-05', carryOver: 2, notes: 'line1\nline2', links: [{ id: 'l', url: 'https://x.io' }], checklist: [{ id: 'c', text: 'draft', done: true }, { id: 'd', text: 'edit', done: false }], smart: { specific: 'hero', achievable: 'yes', relevant: 'core' } }, '2026-09-30T10:00:00Z'),
    makeItem({ id: 's1', title: 'Headline', parentId: 't1', projectId: 'p1', grade: 'B', gradeRank: 1, done: true, doneAt: '2026-10-01T09:00:00Z', waitingOnId: 't1' }, '2026-09-30T10:01:00Z'),
    makeItem({ id: 't2', title: 'Water plants', areaId: 'a2' }, '2026-09-30T10:02:00Z'),
    makeItem({ id: 't3', title: '=HYPERLINK("evil")' }, '2026-09-30T10:03:00Z'),
  ],
  plans: { '2026-10-02': { date: '2026-10-02', locked: false, pushed: false, blocks: [{ id: 'b', kind: 'item', itemId: 't1', rank: 1, estimateMin: 30, done: false }] } },
})

describe('csvCell', () => {
  it('quotes commas, quotes and newlines; neutralizes formulas', () => {
    expect(csvCell('plain')).toBe('plain')
    expect(csvCell('a,b')).toBe('"a,b"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
    expect(csvCell('a\nb')).toBe('"a\nb"')
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)")
    expect(csvCell('@x')).toBe("'@x")
    expect(csvCell(undefined)).toBe('')
    expect(csvCell(5)).toBe('5')
    expect(csvCell(true)).toBe('yes')
  })
})

describe('buildCsv', () => {
  const rows = parseCsv(buildCsv(base()).replace(/^\uFEFF/, ''))
  const col = (name: string) => rows[0].indexOf(name)
  const find = (type: string, title: string) => rows.find((r) => r[col('Type')] === type && [r[col('Area')], r[col('Project')], r[col('Task')], r[col('Subtask')]].includes(title))!

  it('starts with a BOM (Excel, Hebrew) and has a header row', () => {
    expect(buildCsv(base()).charCodeAt(0)).toBe(0xfeff)
    expect(rows[0]).toEqual(expect.arrayContaining(['Type', 'Area', 'Project', 'Task', 'Subtask', 'Grade', 'Rank', 'Done', 'Estimate (min)', 'Due', 'Carry-over', 'Waiting on', 'Notes', 'Planned on']))
  })
  it('has area, project, task and subtask rows with the full path', () => {
    expect(rows.filter((r) => r[col('Type')] === 'area')).toHaveLength(2)
    expect(rows.filter((r) => r[col('Type')] === 'project')).toHaveLength(2)
    const sub = rows.find((r) => r[col('Type')] === 'subtask')!
    expect([sub[col('Area')], sub[col('Project')], sub[col('Task')], sub[col('Subtask')]]).toEqual(['Work', 'Launch', 'Write copy, "v1"', 'Headline'])
  })
  it('keeps empty projects and archived flag, project SMART and due', () => {
    const empty = rows.find((r) => r[col('Type')] === 'project' && r[col('Project')] === 'Empty')!
    expect(empty[col('Archived')]).toBe('yes')
    const p = rows.find((r) => r[col('Type')] === 'project' && r[col('Project')] === 'Launch')!
    expect([p[col('Measurable')], p[col('Target')], p[col('Current')], p[col('Due')]]).toEqual(['milestones', '5', '3', '2026-12-01'])
  })
  it('exports ABCDE grade, rank label, done state, carry-over, estimate, due, and waiting-on', () => {
    const t = find('task', 'Write copy, "v1"')
    expect([t[col('Grade')], t[col('Rank')], t[col('Estimate (min)')], t[col('Due')], t[col('Carry-over')]]).toEqual(['A', 'A1', '90', '2026-10-05', '2'])
    const s = rows.find((r) => r[col('Type')] === 'subtask')!
    expect([s[col('Grade')], s[col('Done')], s[col('Done at')], s[col('Waiting on')]]).toEqual(['B', 'yes', '2026-10-01T09:00:00Z', 'Write copy, "v1"'])
  })
  it('exports SMART fields, checklist, links, notes and planned dates', () => {
    const t = find('task', 'Write copy, "v1"')
    expect(t[col('Specific')]).toBe('hero')
    expect(t[col('Checklist')]).toBe('[x] draft; [ ] edit')
    expect(t[col('Links')]).toBe('https://x.io')
    expect(t[col('Notes')]).toBe('line1\nline2')
    expect(t[col('Planned on')]).toBe('2026-10-02')
  })
  it('puts area-only and loose tasks in the right place', () => {
    const w = find('task', 'Water plants')
    expect([w[col('Area')], w[col('Project')]]).toEqual(['Home', ''])
    const loose = rows.find((r) => r[col('Type')] === 'task' && r[col('Task')].includes('HYPERLINK'))!
    expect([loose[col('Area')], loose[col('Project')]]).toEqual(['', ''])
    expect(loose[col('Task')].startsWith("'=")).toBe(true)
  })
  it('an empty db yields just the header', () => {
    expect(parseCsv(buildCsv(emptyDb()).replace(/^\uFEFF/, ''))).toHaveLength(1)
  })
})
