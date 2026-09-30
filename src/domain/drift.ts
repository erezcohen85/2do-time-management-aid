import type { ScheduleResult } from './schedule'

export interface Drift {
  kind: 'behind' | 'ahead' | 'onTrack' | 'none'
  minutes: number
}

/**
 * Drift of the day: compare "now" with the top unfinished block (by rank).
 * Behind: now is past its scheduled end. Ahead: it has not started yet.
 * On track: now is inside it. None: nothing left to do.
 */
export function drift(result: ScheduleResult, nowMin: number): Drift {
  const open = result.blocks.filter((s) => !s.block.done).sort((a, b) => a.block.rank - b.block.rank)
  const top = open[0]
  if (!top) return { kind: 'none', minutes: 0 }
  if (nowMin > top.endMin) return { kind: 'behind', minutes: nowMin - top.endMin }
  if (nowMin < top.startMin) return { kind: 'ahead', minutes: top.startMin - nowMin }
  return { kind: 'onTrack', minutes: 0 }
}
