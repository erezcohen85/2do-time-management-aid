import { CalendarDays, CornerDownRight, GripVertical, Lock, RotateCw } from 'lucide-react'
import type { HTMLAttributes, Ref } from 'react'
import { GradePicker } from '@/components/grade-chips'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { actions } from '@/data/actions'
import { useDb } from '@/data/hooks'
import { isBlocked, rankLabel, smartCount } from '@/domain/items'
import { locationLabel, locationOf } from '@/domain/location'
import { parseDate } from '@/domain/time'
import { useI18n } from '@/i18n'
import { useDetail } from '@/lib/detail-state'
import { cn } from '@/lib/utils'
import type { Item } from '@/types'

export interface ItemRowProps {
  item: Item
  showRank?: boolean
  /** Show one-click grade buttons (Ungraded inbox). */
  gradePicker?: boolean
  showPath?: boolean
  indent?: boolean
  dragHandle?: HTMLAttributes<HTMLButtonElement>
  rowRef?: Ref<HTMLDivElement>
  style?: React.CSSProperties
  dragging?: boolean
}

export function ItemRow({
  item, showRank, gradePicker, showPath = true, indent, dragHandle, rowRef, style, dragging,
}: ItemRowProps) {
  const { t, fmt } = useI18n()
  const { openItem } = useDetail()
  const items = useDb((db) => db.items)
  const projects = useDb((db) => db.projects)
  const areas = useDb((db) => db.areas)

  const path = locationLabel(locationOf(item, projects, areas))
  const parent = item.parentId ? items.find((i) => i.id === item.parentId) : undefined
  const blocker = item.waitingOnId ? items.find((i) => i.id === item.waitingOnId) : undefined
  const blocked = isBlocked(item, items)
  const rank = showRank ? rankLabel(item, items) : null
  const smartN = item.smart ? smartCount(item.smart, item.due) : 0

  return (
    <div
      ref={rowRef}
      style={style}
      data-testid="item-row"
      data-item-id={item.id}
      className={cn(
        'flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-sm',
        indent && 'ms-6',
        dragging && 'opacity-60 shadow-md',
        blocked && 'opacity-60',
      )}
    >
      {dragHandle && (
        <button
          type="button"
          aria-label={t('tm.drag')}
          className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          {...dragHandle}
        >
          <GripVertical className="size-4" />
        </button>
      )}
      {showRank && (
        <span className="w-8 shrink-0 font-mono text-xs text-muted-foreground" data-testid="rank">
          {rank ?? ''}
        </span>
      )}
      <Checkbox
        checked={item.done}
        aria-label={t('row.tick', { title: item.title })}
        onCheckedChange={(v) => actions.setItemDone(item.id, v === true)}
      />
      <button
        type="button"
        onClick={() => openItem(item.id)}
        className={cn('min-w-0 flex-1 truncate text-start', item.done && 'text-muted-foreground line-through')}
      >
        {item.title}
      </button>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
        {showPath && parent && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <CornerDownRight className="size-3 rtl:-scale-x-100" />
            {parent.title}
          </span>
        )}
        {showPath && path && <span className="text-xs text-muted-foreground">{path}</span>}
        {smartN > 0 && <Badge variant="secondary">{t('row.smart', { n: smartN })}</Badge>}
        {item.carryOver > 0 && (
          <Badge variant="outline" title={t('row.carry', { n: item.carryOver })} className="gap-1">
            <RotateCw className="size-3" />
            {item.carryOver}
          </Badge>
        )}
        {item.due && (
          <Badge variant="outline" className="gap-1" title={t('row.due', { date: fmt(parseDate(item.due), { dateStyle: 'medium' }) })}>
            <CalendarDays className="size-3" />
            {fmt(parseDate(item.due), { day: 'numeric', month: 'short' })}
          </Badge>
        )}
        {blocked && blocker && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Lock className="size-4 text-muted-foreground" aria-label={t('row.blocked', { title: blocker.title })} />
            </TooltipTrigger>
            <TooltipContent>{t('row.blocked', { title: blocker.title })}</TooltipContent>
          </Tooltip>
        )}
      </div>
      {gradePicker && <GradePicker value={item.grade} onChange={(g) => actions.setGrade(item.id, g)} />}
    </div>
  )
}
