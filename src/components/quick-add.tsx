import { useState } from 'react'
import { toast } from 'sonner'
import { LocationSelect, type Place } from '@/components/location-select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { actions, makeItem, newId } from '@/data/actions'
import { useDb } from '@/data/hooks'
import { useI18n } from '@/i18n'
import { ui, useUi } from '@/lib/ui-store'

function QuickAddForm({ onDone }: { onDone: () => void }) {
  const { t } = useI18n()
  const areas = useDb((db) => db.areas)
  const [title, setTitle] = useState('')
  const [place, setPlace] = useState<Place>({ projectId: null, areaId: null })
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim()) return
        actions.addItem(makeItem({ id: newId(), title: title.trim(), projectId: place.projectId, areaId: place.areaId }))
        toast.success(t('qa.added'))
        onDone()
      }}
    >
      <DialogHeader>
        <DialogTitle>{t('qa.title')}</DialogTitle>
        <DialogDescription>{t('qa.hint')}</DialogDescription>
      </DialogHeader>
      <Input autoFocus aria-label={t('qa.placeholder')} placeholder={t('qa.placeholder')} value={title} onChange={(e) => setTitle(e.target.value)} />
      {areas.length > 0 && (
        <div className="grid gap-1.5">
          <Label htmlFor="qa-project">{t('qa.project')}</Label>
          <LocationSelect id="qa-project" value={place} onChange={setPlace} />
        </div>
      )}
      <DialogFooter>
        <Button type="submit" disabled={!title.trim()}>
          {t('qa.submit')}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function QuickAdd() {
  const open = useUi('quickAdd')
  return (
    <Dialog open={open} onOpenChange={(o) => ui.set('quickAdd', o)}>
      <DialogContent>{open && <QuickAddForm onDone={() => ui.close('quickAdd')} />}</DialogContent>
    </Dialog>
  )
}
