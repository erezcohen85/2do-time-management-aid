import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDb } from '@/data/hooks'
import { useI18n } from '@/i18n'

export interface Place {
  projectId: string | null
  areaId: string | null
}

const NONE = 'none'
const encode = (p: Place) => (p.projectId ? `p:${p.projectId}` : p.areaId ? `a:${p.areaId}` : NONE)
const decode = (v: string): Place =>
  v.startsWith('p:') ? { projectId: v.slice(2), areaId: null } : v.startsWith('a:') ? { projectId: null, areaId: v.slice(2) } : { projectId: null, areaId: null }

/** Pick where a task lives: no place, an area (without a project), or a project. */
export function LocationSelect({ value, onChange, id }: { value: Place; onChange: (p: Place) => void; id?: string }) {
  const { t } = useI18n()
  const areas = useDb((db) => db.areas)
  const projects = useDb((db) => db.projects)
  return (
    <Select value={encode(value)} onValueChange={(v) => onChange(decode(v))}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{t('tm.noProject')}</SelectItem>
        {areas.map((a) => (
          <SelectGroup key={a.id}>
            <SelectSeparator />
            <SelectLabel>{a.name}</SelectLabel>
            <SelectItem value={`a:${a.id}`}>{t('loc.areaOnly', { area: a.name })}</SelectItem>
            {projects
              .filter((p) => p.areaId === a.id && (!p.archived || p.id === value.projectId))
              .map((p) => (
                <SelectItem key={p.id} value={`p:${p.id}`}>
                  {p.name}
                </SelectItem>
              ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}
