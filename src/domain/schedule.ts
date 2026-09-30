import type { Block, TimeStr } from '@/types'
import { fromMin, toMin } from './time'

export interface CalendarEvent {
  id: string
  title: string
  start: TimeStr
  end: TimeStr
}

export interface ScheduledBlock {
  block: Block
  start: TimeStr
  end: TimeStr
  startMin: number
  endMin: number
  /** Pinned block overlapping an event or another pinned block. */
  conflict: boolean
}

export interface ScheduleResult {
  blocks: ScheduledBlock[]
  /** End of the last block (or day start when empty). */
  endMin: number
  totalMin: number
  overflow: boolean
}

interface Interval {
  start: number
  end: number
}

const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end

/**
 * Auto-stack: unpinned blocks flow in rank order from `dayStart`, skipping over
 * fixed intervals (calendar events and pinned blocks). Pinned blocks stay put.
 */
export function schedule(
  blocks: Block[],
  events: CalendarEvent[],
  opts: { dayStart: TimeStr; overflowAfter: TimeStr },
): ScheduleResult {
  const dayStart = toMin(opts.dayStart)
  const ordered = [...blocks].sort((a, b) => a.rank - b.rank)

  const eventIntervals: Interval[] = events.map((e) => ({ start: toMin(e.start), end: toMin(e.end) }))
  const pinned = ordered.filter((b) => b.pinnedStart)
  const pinnedIntervals = new Map<string, Interval>(
    pinned.map((b) => {
      const start = toMin(b.pinnedStart!)
      return [b.id, { start, end: start + b.estimateMin }]
    }),
  )
  const fixed: Interval[] = [...eventIntervals, ...pinnedIntervals.values()].sort((a, b) => a.start - b.start)

  const placed = new Map<string, Interval>()
  let cursor = dayStart
  for (const block of ordered) {
    if (block.pinnedStart) {
      placed.set(block.id, pinnedIntervals.get(block.id)!)
      continue
    }
    let start = cursor
    for (;;) {
      const cand = { start, end: start + block.estimateMin }
      const hit = fixed.find((f) => overlaps(cand, f) && f.end > start)
      if (!hit) break
      start = hit.end
    }
    placed.set(block.id, { start, end: start + block.estimateMin })
    cursor = start + block.estimateMin
  }

  const scheduled: ScheduledBlock[] = ordered.map((block) => {
    const iv = placed.get(block.id)!
    let conflict = false
    if (block.pinnedStart) {
      conflict =
        eventIntervals.some((e) => overlaps(iv, e)) ||
        pinned.some((o) => o.id !== block.id && overlaps(iv, pinnedIntervals.get(o.id)!))
    }
    return { block, start: fromMin(iv.start), end: fromMin(iv.end), startMin: iv.start, endMin: iv.end, conflict }
  })
  scheduled.sort((a, b) => a.startMin - b.startMin || a.block.rank - b.block.rank)

  const endMin = scheduled.length ? Math.max(...scheduled.map((s) => s.endMin)) : dayStart
  return {
    blocks: scheduled,
    endMin,
    totalMin: blocks.reduce((sum, b) => sum + b.estimateMin, 0),
    overflow: scheduled.length > 0 && endMin > toMin(opts.overflowAfter),
  }
}
