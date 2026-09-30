import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { GradeDot } from '@/components/grade-chips'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { actions, newId } from '@/data/actions'
import { useDb } from '@/data/hooks'
import { candidates } from '@/domain/plan'
import { capStatus } from '@/domain/plan'
import { store } from '@/data/store'
import { useI18n } from '@/i18n'
import type { DateStr } from '@/types'

/** Quick add of a candidate to today, subject to the cap. */
export function CarryOverPool({ date }: { date: DateStr }) {
  const { t } = useI18n()
  const items = useDb((db) => db.items)
  const plans = useDb((db) => db.plans)
  const c = candidates(items, plans, date)
  const pool = [...c.leftovers, ...c.due, ...c.byGrade.A].filter((x) => !x.blocked)

  function add(itemId: string) {
    const before = store.getState().plans[date]?.blocks.length ?? 0
    actions.addItemBlock(date, itemId, { id: newId() })
    if ((store.getState().plans[date]?.blocks.length ?? 0) === before) {
      toast.error(t('today.capReached', { cap: capStatus(store.getState().plans[date], store.getState().settings).cap }))
    }
  }

  return (
    <Collapsible data-testid="carryover-pool">
      <CollapsibleTrigger className="flex w-full items-center gap-2 py-1 text-start text-sm font-semibold">
        {t('today.carry')} <span className="font-normal text-muted-foreground">({pool.length})</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="grid gap-1.5 pt-1">
        <p className="text-xs text-muted-foreground">{t('today.carry.hint')}</p>
        {pool.length === 0 && <p className="text-xs text-muted-foreground">{t('today.carry.empty')}</p>}
        {pool.map(({ item }) => (
          <div key={item.id} className="flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-sm" data-testid="pool-item">
            {item.grade && <GradeDot grade={item.grade} />}
            <span className="min-w-0 flex-1 truncate">{item.title}</span>
            <Button variant="ghost" size="icon" className="size-7" aria-label={t('today.carry.add', { title: item.title })} onClick={() => add(item.id)}>
              <Plus />
            </Button>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}
