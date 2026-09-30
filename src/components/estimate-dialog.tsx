import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useI18n } from '@/i18n'

function Form({ title, initial, onConfirm }: { title: string; initial: number; onConfirm: (min: number) => void }) {
  const { t } = useI18n()
  const [v, setV] = useState(String(initial))
  const n = Math.round(Number(v))
  const valid = Number.isFinite(n) && n >= 5 && n <= 720
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onConfirm(n)
      }}
    >
      <DialogHeader>
        <DialogTitle>{t('plan.estimate.title')}</DialogTitle>
        <p className="truncate text-sm text-muted-foreground">{title}</p>
      </DialogHeader>
      <div className="grid gap-1.5">
        <Label htmlFor="estimate-min">{t('plan.estimate.label')}</Label>
        <Input id="estimate-min" autoFocus type="number" min={5} max={720} value={v} onChange={(e) => setV(e.target.value)} onFocus={(e) => e.target.select()} />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={!valid}>
          {t('plan.estimate.confirm')}
        </Button>
      </DialogFooter>
    </form>
  )
}

/** Asks for a duration when an item is dropped onto a plan. Prefilled with the item's or the default estimate. */
export function EstimateDialog({
  open, onOpenChange, itemTitle, initial, onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  itemTitle: string
  initial: number
  onConfirm: (min: number) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>{open && <Form title={itemTitle} initial={initial} onConfirm={onConfirm} />}</DialogContent>
    </Dialog>
  )
}
