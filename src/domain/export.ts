import type { Db, Item } from '@/types'
import { rankLabel } from './items'

/** One CSV cell: quoted when needed, formulas neutralized (spreadsheet injection). */
export function csvCell(v: string | number | boolean | undefined | null): string {
  if (v === undefined || v === null) return ''
  if (typeof v === 'boolean') return v ? 'yes' : ''
  let s = String(v)
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const HEADERS = [
  'Type', 'Area', 'Project', 'Task', 'Subtask', 'Grade', 'Rank', 'Done', 'Done at', 'Archived',
  'Estimate (min)', 'Due', 'Carry-over', 'Waiting on',
  'Specific', 'Measurable', 'Target', 'Current', 'Achievable', 'Relevant',
  'Checklist', 'Links', 'Notes', 'Planned on', 'Created',
] as const

/**
 * Everything the app knows about areas, projects, tasks and subtasks as one CSV:
 * one row per area, project, task and subtask, with the full path in the first columns.
 * Starts with a BOM so Excel reads Hebrew correctly.
 */
export function buildCsv(db: Db): string {
  const rows: (string | number | boolean | undefined)[][] = []
  const row = (o: Partial<Record<(typeof HEADERS)[number], string | number | boolean | undefined>>) =>
    rows.push(HEADERS.map((h) => o[h]))

  const planned = (id: string) =>
    Object.values(db.plans)
      .filter((p) => p.blocks.some((b) => b.itemId === id))
      .map((p) => p.date)
      .sort()
      .join('; ')

  const itemRow = (it: Item, kind: 'task' | 'subtask', areaName?: string, projectName?: string, parentTitle?: string) =>
    row({
      Type: kind,
      Area: areaName,
      Project: projectName,
      Task: kind === 'task' ? it.title : parentTitle,
      Subtask: kind === 'subtask' ? it.title : undefined,
      Grade: it.grade ?? undefined,
      Rank: rankLabel(it, db.items) ?? undefined,
      Done: it.done,
      'Done at': it.doneAt,
      'Estimate (min)': it.estimateMin,
      Due: it.due,
      'Carry-over': it.carryOver || undefined,
      'Waiting on': it.waitingOnId ? db.items.find((i) => i.id === it.waitingOnId)?.title : undefined,
      Specific: it.smart?.specific,
      Measurable: it.smart?.metric,
      Target: it.smart?.target,
      Current: it.smart?.current,
      Achievable: it.smart?.achievable,
      Relevant: it.smart?.relevant,
      Checklist: it.checklist.map((c) => `${c.done ? '[x]' : '[ ]'} ${c.text}`).join('; ') || undefined,
      Links: it.links.map((l) => l.url).join('; ') || undefined,
      Notes: it.notes,
      'Planned on': planned(it.id) || undefined,
      Created: it.createdAt,
    })

  const emit = (it: Item, areaName?: string, projectName?: string) => {
    itemRow(it, 'task', areaName, projectName)
    for (const s of db.items.filter((x) => x.parentId === it.id)) itemRow(s, 'subtask', areaName, projectName, it.title)
  }
  const tasksOf = (pred: (i: Item) => boolean) => db.items.filter((i) => i.parentId === null && pred(i))

  for (const area of [...db.areas].sort((a, b) => a.order - b.order)) {
    row({ Type: 'area', Area: area.name })
    for (const t of tasksOf((i) => !i.projectId && i.areaId === area.id)) emit(t, area.name)
    for (const p of db.projects.filter((x) => x.areaId === area.id).sort((a, b) => a.order - b.order)) {
      row({
        Type: 'project', Area: area.name, Project: p.name, Archived: p.archived, Due: p.due,
        Specific: p.smart?.specific, Measurable: p.smart?.metric, Target: p.smart?.target, Current: p.smart?.current,
        Achievable: p.smart?.achievable, Relevant: p.smart?.relevant,
      })
      for (const t of tasksOf((i) => i.projectId === p.id)) emit(t, area.name, p.name)
    }
  }
  const known = new Set(db.areas.map((a) => a.id))
  for (const t of tasksOf((i) => !i.projectId && !(i.areaId && known.has(i.areaId)))) emit(t)

  const lines = [HEADERS.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))]
  return '﻿' + lines.join('\r\n') + '\r\n'
}

/** Minimal RFC 4180 reader (used by tests and anyone re-importing the file). */
export function parseCsv(text: string): string[][] {
  const out: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(cell)
      cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      out.push(row)
      row = []
      cell = ''
    } else cell += c
  }
  if (cell !== '' || row.length) {
    row.push(cell)
    out.push(row)
  }
  return out
}
