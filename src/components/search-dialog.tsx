import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { useDb } from '@/data/hooks'
import { useI18n } from '@/i18n'
import { useDetail } from '@/lib/detail-state'
import { ui, useUi } from '@/lib/ui-store'

export function SearchDialog() {
  const { t } = useI18n()
  const open = useUi('search')
  const { openItem, openProject } = useDetail()
  const items = useDb((db) => db.items)
  const projects = useDb((db) => db.projects)
  const areas = useDb((db) => db.areas)
  const areaName = (id: string) => areas.find((a) => a.id === id)?.name ?? ''
  const pick = (fn: () => void) => {
    ui.close('search')
    fn()
  }
  return (
    <CommandDialog open={open} onOpenChange={(o) => ui.set('search', o)} title={t('tm.search')} description={t('search.placeholder')}>
      <CommandInput placeholder={t('search.placeholder')} />
      <CommandList>
        <CommandEmpty>{t('search.empty')}</CommandEmpty>
        {items.length > 0 && (
          <CommandGroup heading={t('search.tasks')}>
            {items.map((i) => {
              const p = projects.find((x) => x.id === i.projectId)
              return (
                <CommandItem
                  key={i.id}
                  value={`${i.title} ${p?.name ?? ''} ${i.id}`}
                  onSelect={() => pick(() => openItem(i.id))}
                >
                  <span className={i.done ? 'text-muted-foreground line-through' : ''}>{i.title}</span>
                  {p && <span className="ms-auto text-xs text-muted-foreground">{p.name}</span>}
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}
        {projects.length > 0 && (
          <CommandGroup heading={t('search.projects')}>
            {projects.map((p) => (
              <CommandItem key={p.id} value={`${p.name} ${areaName(p.areaId)} ${p.id}`} onSelect={() => pick(() => openProject(p.id))}>
                {p.name}
                <span className="ms-auto text-xs text-muted-foreground">{areaName(p.areaId)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
