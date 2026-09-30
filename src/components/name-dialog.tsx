import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/i18n'

/** Small "type a name" dialog used to add and rename areas and projects. */
export function NameDialog({
  open, onOpenChange, title, label, initial = '', onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  label: string
  initial?: string
  onSubmit: (name: string) => void
}) {
  const { t } = useI18n()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && <NameForm {...{ title, label, initial, onSubmit, onCancel: () => onOpenChange(false), t }} />}
      </DialogContent>
    </Dialog>
  )
}

function NameForm({ title, label, initial, onSubmit, onCancel, t }: {
  title: string
  label: string
  initial: string
  onSubmit: (name: string) => void
  onCancel: () => void
  t: ReturnType<typeof useI18n>['t']
}) {
  const [name, setName] = useState(initial)
  const submit = () => {
    const v = name.trim()
    if (v) onSubmit(v)
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="grid gap-4"
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <Input autoFocus aria-label={label} placeholder={label} value={name} onChange={(e) => setName(e.target.value)} />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={!name.trim()}>
          {t('common.save')}
        </Button>
      </DialogFooter>
    </form>
  )
}
