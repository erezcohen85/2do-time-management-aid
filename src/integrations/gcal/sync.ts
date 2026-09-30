import type { Block, DateStr } from '@/types'
import type { ScheduledBlock } from '@/domain/schedule'
import { parseDate, toMin } from '@/domain/time'
import type { GEventInput } from './types'

export interface DesiredEvent {
  blockId: string
  input: GEventInput
  /** Signature used to detect changes since the last push. */
  sig: string
}

export type SyncOp =
  | { type: 'create'; blockId: string; input: GEventInput; sig: string }
  | { type: 'update'; blockId: string; eventId: string; input: GEventInput; sig: string }
  | { type: 'delete'; eventId: string }

const localTime = (date: DateStr, min: number): string => {
  const d = parseDate(date)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, min).toISOString()
}

/** What the calendar should contain for this day: one event per block, in rank order numbering. */
export function desiredEvents(
  date: DateStr,
  scheduled: ScheduledBlock[],
  blocks: Block[],
  titleOf: (b: Block) => string,
): DesiredEvent[] {
  const position = new Map([...blocks].sort((a, b) => a.rank - b.rank).map((blk, i) => [blk.id, i + 1]))
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  return scheduled
    .map((s) => {
      const b = s.block
      const summary = `${b.done ? '✔ ' : ''}${position.get(b.id)}. ${titleOf(b)}`
      const start = localTime(date, toMin(s.start))
      const end = localTime(date, s.endMin)
      return {
        blockId: b.id,
        input: { summary, start: { dateTime: start, timeZone }, end: { dateTime: end, timeZone } },
        sig: `${summary}|${start}|${end}`,
      }
    })
    .sort((a, b) => (position.get(a.blockId) ?? 0) - (position.get(b.blockId) ?? 0))
}

/** Diff the plan against what was last pushed: create, update what changed, delete orphans. */
export function planSync(desired: DesiredEvent[], blocks: Block[], orphanedEventIds: string[]): SyncOp[] {
  const ops: SyncOp[] = []
  for (const d of desired) {
    const block = blocks.find((b) => b.id === d.blockId)
    if (!block) continue
    if (!block.gcalEventId) ops.push({ type: 'create', blockId: d.blockId, input: d.input, sig: d.sig })
    else if (block.gcalSig !== d.sig) ops.push({ type: 'update', blockId: d.blockId, eventId: block.gcalEventId, input: d.input, sig: d.sig })
  }
  for (const eventId of orphanedEventIds) ops.push({ type: 'delete', eventId })
  return ops
}
