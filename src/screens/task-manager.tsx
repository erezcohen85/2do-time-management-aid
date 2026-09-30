import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { ByGrade } from '@/components/by-grade'
import { ByProject } from '@/components/by-project'
import { UngradedInbox } from '@/components/ungraded-inbox'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useDb } from '@/data/hooks'
import { useI18n } from '@/i18n'
import { ui } from '@/lib/ui-store'

type View = 'grade' | 'project'

export function TaskManagerScreen() {
  const { t } = useI18n()
  const [view, setView] = useState<View>(() => (localStorage.getItem('2do.tm.view') === 'project' ? 'project' : 'grade'))
  const empty = useDb((db) => db.items.length === 0 && db.areas.length === 0)

  const changeView = (v: View) => {
    setView(v)
    localStorage.setItem('2do.tm.view', v)
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="me-auto text-2xl font-semibold tracking-tight">{t('nav.tasks')}</h1>
        <ToggleGroup
          type="single"
          variant="outline"
          value={view}
          onValueChange={(v) => v && changeView(v as View)}
          aria-label={t('nav.tasks')}
        >
          <ToggleGroupItem value="project">{t('tm.view.project')}</ToggleGroupItem>
          <ToggleGroupItem value="grade">{t('tm.view.grade')}</ToggleGroupItem>
        </ToggleGroup>
        <Button variant="outline" size="icon" aria-label={t('tm.search')} onClick={() => ui.open('search')}>
          <Search />
        </Button>
        <Button onClick={() => ui.open('quickAdd')}>
          <Plus /> {t('tm.add')}
        </Button>
      </div>
      {empty && <p className="text-sm text-muted-foreground">{t('tm.empty')}</p>}
      <UngradedInbox />
      {view === 'grade' ? <ByGrade /> : <ByProject />}
    </div>
  )
}
