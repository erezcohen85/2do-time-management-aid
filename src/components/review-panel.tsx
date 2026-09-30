import { CheckCircle2 } from 'lucide-react'
import { DraftTextarea } from '@/components/draft-fields'
import { GradeDot, GradePicker } from '@/components/grade-chips'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { actions } from '@/data/actions'
import { useDb } from '@/data/hooks'
import { smartProgress } from '@/domain/items'
import { activeProjectsForReview, scorecard } from '@/domain/review'
import { formatMinutes, parseDate } from '@/domain/time'
import { weekStartOf } from '@/domain/week'
import { useI18n } from '@/i18n'
import { useDetail } from '@/lib/detail-state'
import { GRADES, type DateStr } from '@/types'

/** Thursday (or configured day) review: scorecard, active projects walk, reflection. Saved per week. */
export function ReviewPanel({ date }: { date: DateStr }) {
  const { t, fmt } = useI18n()
  const { openItem } = useDetail()
  const settings = useDb((db) => db.settings)
  const plans = useDb((db) => db.plans)
  const items = useDb((db) => db.items)
  const projects = useDb((db) => db.projects)
  const sessions = useDb((db) => db.sessions)
  const reviews = useDb((db) => db.reviews)
  const weekStart = weekStartOf(date, settings.weekStart)
  const review = reviews[weekStart]
  const sc = scorecard(weekStart, settings.visibleDays, plans, items, sessions)
  const active = activeProjectsForReview(projects, items)
  const completed = !!review?.completedAt

  return (
    <section className="grid gap-4" data-testid="review-panel" aria-labelledby="review-h">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="review-h" className="text-xl font-semibold tracking-tight">
          {t('review.title')}
        </h2>
        <span className="text-sm text-muted-foreground">{t('review.week', { date: fmt(parseDate(weekStart), { day: 'numeric', month: 'short', year: 'numeric' }) })}</span>
        {completed && (
          <Badge className="gap-1" data-testid="review-completed">
            <CheckCircle2 className="size-3" /> {t('review.completed')}
          </Badge>
        )}
      </div>

      <Card data-testid="review-scorecard">
        <CardHeader>
          <CardTitle className="text-lg">{t('review.scorecard')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            {sc.days.map((d) => (
              <div key={d.date} className="grid min-w-16 justify-items-center rounded-md border px-2 py-1.5" data-testid={`review-day-${d.date}`}>
                <span className="text-xs text-muted-foreground">{fmt(parseDate(d.date), { weekday: 'short' })}</span>
                <span className="font-mono text-sm">{d.total > 0 ? `${d.done}/${d.total}` : '–'}</span>
              </div>
            ))}
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <div className="text-xs text-muted-foreground">{t('review.fullDays')}</div>
              <div className="text-lg font-semibold" data-testid="review-full-days">{sc.fullDays}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t('review.taggedTime')}</div>
              <div className="text-lg font-semibold" data-testid="review-tagged">{formatMinutes(sc.taggedMin)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t('review.untaggedTime')}</div>
              <div className="text-lg font-semibold" data-testid="review-untagged">{formatMinutes(sc.untaggedMin)}</div>
            </div>
          </div>
          <Separator />
          <div>
            <div className="mb-1 text-xs text-muted-foreground">{t('review.doneByGrade')}</div>
            <div className="flex flex-wrap gap-3">
              {GRADES.map((g) => (
                <span key={g} className="flex items-center gap-1.5 text-sm" data-testid={`review-grade-${g}`}>
                  <GradeDot grade={g} />
                  {g} <span className="font-mono font-semibold">{sc.doneByGrade[g]}</span>
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="review-projects">
        <CardHeader>
          <CardTitle className="text-lg">{t('review.projects')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          {active.length === 0 && <p className="text-sm text-muted-foreground">{t('review.projects.empty')}</p>}
          {active.map((p) => {
            const open = items.filter((i) => i.projectId === p.id && !i.done)
            const progress = smartProgress(p.smart)
            const carried = open.filter((i) => i.carryOver > 0)
            return (
              <div key={p.id} className="grid gap-2" data-testid="review-project" data-project-id={p.id}>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{p.name}</h3>
                  <span className="text-xs text-muted-foreground">{t('review.projects.open', { n: open.length })}</span>
                </div>
                {progress !== null && (
                  <div className="grid gap-1" data-testid="review-project-progress">
                    <Progress value={Math.round(progress * 100)} />
                    <span className="text-xs text-muted-foreground">
                      {t('smart.progress', { current: p.smart?.current ?? 0, target: p.smart?.target ?? 0, metric: p.smart?.metric ?? '' })}
                    </span>
                  </div>
                )}
                <div className="grid gap-1.5">
                  {open.map((i) => (
                    <div key={i.id} className="flex flex-wrap items-center gap-2 rounded-md border px-2 py-1.5 text-sm" data-testid="review-item">
                      <button type="button" className="min-w-0 flex-1 truncate text-start" onClick={() => openItem(i.id)}>
                        {i.title}
                      </button>
                      {i.carryOver > 0 && (
                        <Badge variant="outline" title={t('review.carried')}>
                          ↻{i.carryOver}
                        </Badge>
                      )}
                      <GradePicker value={i.grade} allowClear onChange={(g) => actions.setGrade(i.id, g)} />
                    </div>
                  ))}
                </div>
                {carried.length > 0 && (
                  <p className="text-xs text-muted-foreground" data-testid="review-carried">
                    {t('review.carried')}: {carried.map((i) => i.title).join(', ')}
                  </p>
                )}
                <div className="grid gap-1.5">
                  <Label htmlFor={`note-${p.id}`} className="text-xs text-muted-foreground">
                    {t('review.projects.note')}
                  </Label>
                  <DraftTextarea
                    id={`note-${p.id}`}
                    rows={2}
                    value={review?.projectNotes[p.id] ?? ''}
                    onCommit={(note) => actions.setProjectNote(weekStart, p.id, note)}
                  />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card data-testid="review-reflection">
        <CardHeader>
          <CardTitle className="text-lg">{t('review.reflection')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {(['wentWell', 'slipped', 'nextFocus'] as const).map((k) => (
            <div key={k} className="grid gap-1.5">
              <Label htmlFor={`refl-${k}`}>{t(`review.${k}`)}</Label>
              <DraftTextarea
                key={weekStart}
                id={`refl-${k}`}
                rows={3}
                value={review?.[k] ?? ''}
                onCommit={(v) => actions.updateReview(weekStart, { [k]: v || undefined })}
              />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">{t('review.hint')}</p>
          <div>
            {completed ? (
              <Button variant="outline" onClick={() => actions.setReviewComplete(weekStart, false)} data-testid="review-reopen">
                {t('review.reopen')}
              </Button>
            ) : (
              <Button onClick={() => actions.setReviewComplete(weekStart, true)} data-testid="review-complete">
                <CheckCircle2 /> {t('review.complete')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
