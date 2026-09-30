import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { actions, makeItem, newId } from '@/data/actions'
import { useDb } from '@/data/hooks'
import { useI18n } from '@/i18n'
import { ui, useUi } from '@/lib/ui-store'

const NONE = '__none'

function QuickAddForm({ onDone }: { onDone: () => void }) {
  const { t } = useI18n()
  const areas = useDb((db) => db.areas)
  const projects = useDb((db) => db.projects)
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState<string>(NONE)
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim()) return
        actions.addItem(makeItem({ id: newId(), title: title.trim(), projectId: projectId === NONE ? null : projectId }))
        toast.success(t('qa.added'))
        onDone()
      }}
    >
      <DialogHeader>
        <DialogTitle>{t('qa.title')}</DialogTitle>
        <DialogDescription>{t('qa.hint')}</DialogDescription>
      </DialogHeader>
      <Input autoFocus aria-label={t('qa.placeholder')} placeholder={t('qa.placeholder')} value={title} onChange={(e) => setTitle(e.target.value)} />
      {projects.length > 0 && (
        <div className="grid gap-1.5">
          <Label htmlFor="qa-project">{t('qa.project')}</Label>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger id="qa-project" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{t('tm.noProject')}</SelectItem>
              {areas.map((a) => (
                <SelectGroup key={a.id}>
                  <SelectLabel>{a.name}</SelectLabel>
                  {projects
                    .filter((p) => p.areaId === a.id && !p.archived)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
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
