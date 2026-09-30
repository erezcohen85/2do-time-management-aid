import { ItemRow } from '@/components/item-row'
import { useDb } from '@/data/hooks'
import { ungraded } from '@/domain/items'
import { useI18n } from '@/i18n'

export function UngradedInbox() {
  const { t } = useI18n()
  const items = useDb((db) => db.items)
  const list = ungraded(items)
  return (
    <section aria-labelledby="ungraded-h" data-testid="ungraded-inbox" className="grid gap-2">
      <h2 id="ungraded-h" className="flex items-center gap-2 text-lg font-semibold">
        {t('tm.ungraded')}
        <span className="text-sm font-normal text-muted-foreground">({list.length})</span>
      </h2>
      {list.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('tm.ungraded.empty')}</p>
      ) : (
        list.map((i) => <ItemRow key={i.id} item={i} gradePicker />)
      )}
    </section>
  )
}
