import { useState } from 'react'
import { CornerDownRight, Plus, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { DraftInput, DraftNumber, DraftTextarea } from '@/components/draft-fields'
import { DuePicker } from '@/components/due-picker'
import { GradePicker } from '@/components/grade-chips'
import { LinkList } from '@/components/link-list'
import { LocationSelect } from '@/components/location-select'
import { SmartFields } from '@/components/smart-fields'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { actions, makeItem, newId } from '@/data/actions'
import { useDb } from '@/data/hooks'
import { childrenOf, isBlocked, rankLabel, wouldCycle } from '@/domain/items'
import { useI18n } from '@/i18n'
import { useDetail } from '@/lib/detail-state'
import type { Item } from '@/types'

const NONE = '__none'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-2">
      <h3 className="text-sm font-medium">{title}</h3>
      {children}
    </section>
  )
}

function Subtasks({ task }: { task: Item }) {
  const { t } = useI18n()
  const { openItem } = useDetail()
  const items = useDb((db) => db.items)
  const subs = childrenOf(task.id, items)
  const [v, setV] = useState('')
  return (
    <Section title={t('d.subtasks')}>
      <div className="grid gap-1.5" data-testid="subtasks">
        {subs.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-md border px-2 py-1.5">
            <Checkbox
              checked={s.done}
              aria-label={t('row.tick', { title: s.title })}
              onCheckedChange={(c) => actions.setItemDone(s.id, c === true)}
            />
            <button
              type="button"
              className={`min-w-0 flex-1 truncate text-start text-sm ${s.done ? 'text-muted-foreground line-through' : ''}`}
              onClick={() => openItem(s.id)}
            >
              {s.title}
            </button>
            <GradePicker value={s.grade} allowClear onChange={(g) => actions.setGrade(s.id, g)} />
            <Button variant="ghost" size="icon" aria-label={t('common.delete')} onClick={() => actions.deleteItem(s.id)}>
              <Trash2 />
            </Button>
          </div>
        ))}
      </div>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!v.trim()) return
          actions.addItem(makeItem({ id: newId(), title: v.trim(), parentId: task.id, projectId: task.projectId, areaId: task.areaId }))
          setV('')
        }}
      >
        <Plus className="size-4 text-muted-foreground" />
        <Input aria-label={t('d.subtasks.add')} placeholder={t('d.subtasks.add')} value={v} onChange={(e) => setV(e.target.value)} />
      </form>
      <p className="text-xs text-muted-foreground">{t('d.subtasks.hint')}</p>
    </Section>
  )
}

function Checklist({ item }: { item: Item }) {
  const { t } = useI18n()
  const [v, setV] = useState('')
  const set = (checklist: Item['checklist']) => actions.updateItem(item.id, { checklist })
  return (
    <Section title={t('d.checklist')}>
      <div className="grid gap-1.5" data-testid="checklist">
        {item.checklist.map((c) => (
          <div key={c.id} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={c.done}
              aria-label={c.text}
              onCheckedChange={(d) => set(item.checklist.map((x) => (x.id === c.id ? { ...x, done: d === true } : x)))}
            />
            <span className={`flex-1 ${c.done ? 'text-muted-foreground line-through' : ''}`}>{c.text}</span>
            <Button variant="ghost" size="icon" aria-label={t('common.remove')} onClick={() => set(item.checklist.filter((x) => x.id !== c.id))}>
              <Trash2 />
            </Button>
          </div>
        ))}
      </div>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!v.trim()) return
          set([...item.checklist, { id: newId(), text: v.trim(), done: false }])
          setV('')
        }}
      >
        <Plus className="size-4 text-muted-foreground" />
        <Input aria-label={t('d.checklist.add')} placeholder={t('d.checklist.add')} value={v} onChange={(e) => setV(e.target.value)} />
      </form>
    </Section>
  )
}

function WaitingOn({ item }: { item: Item }) {
  const { t } = useI18n()
  const items = useDb((db) => db.items)
  const blocker = items.find((i) => i.id === item.waitingOnId)
  const options = items.filter((i) => i.id !== item.id && (!i.done || i.id === item.waitingOnId) && !wouldCycle(items, item.id, i.id))
  return (
    <Section title={t('d.waiting')}>
      <Select
        value={item.waitingOnId ?? NONE}
        onValueChange={(v) => actions.updateItem(item.id, { waitingOnId: v === NONE ? undefined : v })}
      >
        <SelectTrigger className="w-full" aria-label={t('d.waiting')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{t('d.waiting.none')}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {blocker && isBlocked(item, items) && (
        <p className="text-xs text-muted-foreground">{t('d.waiting.blocked', { title: blocker.title })}</p>
      )}
    </Section>
  )
}

function ItemBody({ item }: { item: Item }) {
  const { t } = useI18n()
  const { openItem, close } = useDetail()
  const items = useDb((db) => db.items)
  const [deleting, setDeleting] = useState(false)
  const parent = item.parentId ? items.find((i) => i.id === item.parentId) : undefined
  const up = (patch: Parameters<typeof actions.updateItem>[1]) => actions.updateItem(item.id, patch)

  return (
    <div className="grid gap-5 px-4 pb-6" data-testid="item-detail">
      {parent && (
        <button type="button" className="flex items-center gap-1 text-start text-xs text-muted-foreground hover:underline" onClick={() => openItem(parent.id)}>
          <CornerDownRight className="size-3 rtl:-scale-x-100" />
          {t('d.parent', { title: parent.title })}
        </button>
      )}
      <div className="grid gap-1.5">
        <Label htmlFor="d-title">{t('d.title')}</Label>
        <DraftInput id="d-title" value={item.title} onCommit={(title) => title.trim() && up({ title: title.trim() })} />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="d-done" checked={item.done} onCheckedChange={(c) => actions.setItemDone(item.id, c === true)} />
        <Label htmlFor="d-done">{t('d.done')}</Label>
        {item.carryOver > 0 && <span className="ms-auto text-xs text-muted-foreground">{t('d.carry', { n: item.carryOver })}</span>}
      </div>
      <div className="grid gap-1.5">
        <Label>{t('d.grade')}</Label>
        <div className="flex items-center gap-3">
          <GradePicker value={item.grade} allowClear size="default" onChange={(g) => actions.setGrade(item.id, g)} />
          <span className="font-mono text-sm text-muted-foreground" data-testid="detail-rank">{rankLabel(item, items) ?? ''}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="d-est">{t('d.estimate')}</Label>
          <DraftNumber id="d-est" min={5} value={item.estimateMin} onCommit={(estimateMin) => up({ estimateMin })} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="d-due">{t('d.due')}</Label>
          <DuePicker id="d-due" value={item.due} onChange={(due) => up({ due })} />
        </div>
      </div>
      {!parent && (
        <div className="grid gap-1.5">
          <Label htmlFor="d-project">{t('d.project')}</Label>
          <LocationSelect
            id="d-project"
            value={{ projectId: item.projectId, areaId: item.areaId ?? null }}
            onChange={(p) => (p.projectId ? actions.moveItemToProject(item.id, p.projectId) : actions.moveItemToArea(item.id, p.areaId))}
          />
        </div>
      )}
      <Separator />
      <SmartFields
        idPrefix="item"
        smart={item.smart}
        due={item.due}
        onChange={(smart) => up({ smart })}
        onDueChange={(due) => up({ due })}
      />
      <Separator />
      {!parent && <Subtasks task={item} />}
      <Checklist item={item} />
      <Section title={t('d.links')}>
        <LinkList links={item.links} onChange={(links) => up({ links })} />
      </Section>
      <WaitingOn item={item} />
      <div className="grid gap-1.5">
        <Label htmlFor="d-notes">{t('d.notes')}</Label>
        <DraftTextarea id="d-notes" rows={4} value={item.notes ?? ''} onCommit={(notes) => up({ notes: notes || undefined })} />
      </div>
      <Separator />
      <div>
        <Button variant="destructive" onClick={() => setDeleting(true)}>
          <Trash2 /> {t('d.delete')}
        </Button>
      </div>
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={t('d.delete.title')}
        body={t('d.delete.body')}
        confirmLabel={t('d.delete')}
        onConfirm={() => {
          close()
          actions.deleteItem(item.id)
        }}
      />
    </div>
  )
}

export function ItemDetail() {
  const { dir } = useI18n()
  const { itemId, close } = useDetail()
  const item = useDb((db) => db.items.find((i) => i.id === itemId))
  return (
    <Sheet open={!!item} onOpenChange={(o) => !o && close()}>
      <SheetContent side={dir === 'rtl' ? 'left' : 'right'} className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader className="pe-12">
          <SheetTitle className="truncate">{item?.title}</SheetTitle>
          <SheetDescription className="sr-only">{item?.title}</SheetDescription>
        </SheetHeader>
        {item && <ItemBody key={item.id} item={item} />}
      </SheetContent>
    </Sheet>
  )
}
