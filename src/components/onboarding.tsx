import { useState } from 'react'
import { CalendarRange, ListTodo, Sparkles, Timer, ClipboardCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useDb } from '@/data/hooks'
import { buildSample, loadSample } from '@/data/sample'
import { store } from '@/data/store'
import { useI18n, type MessageKey } from '@/i18n'
import { onboarding, useOnboarded } from '@/lib/onboarding-state'
import { ui, useUi } from '@/lib/ui-store'

const STEPS: { icon: typeof ListTodo; title: MessageKey; body: MessageKey }[] = [
  { icon: Sparkles, title: 'onboard.s1.title', body: 'onboard.s1.body' },
  { icon: ListTodo, title: 'onboard.s2.title', body: 'onboard.s2.body' },
  { icon: CalendarRange, title: 'onboard.s3.title', body: 'onboard.s3.body' },
  { icon: Timer, title: 'onboard.s4.title', body: 'onboard.s4.body' },
  { icon: ClipboardCheck, title: 'onboard.s5.title', body: 'onboard.s5.body' },
]

function Tour({ canLoadSample, onClose }: { canLoadSample: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const [i, setI] = useState(0)
  const step = STEPS[i]
  const last = i === STEPS.length - 1
  const Icon = step.icon

  return (
    <>
      <DialogHeader>
        <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-secondary">
          <Icon className="size-5" />
        </div>
        <DialogTitle>{t(step.title)}</DialogTitle>
        <DialogDescription className="text-sm leading-relaxed">{t(step.body)}</DialogDescription>
      </DialogHeader>
      <div className="flex items-center justify-between text-xs text-muted-foreground" data-testid="tour-progress">
        <span>{t('onboard.step', { n: i + 1, total: STEPS.length })}</span>
        <span className="flex gap-1.5" aria-hidden>
          {STEPS.map((_, k) => (
            <span key={k} className={`size-1.5 rounded-full ${k === i ? 'bg-primary' : 'bg-border'}`} />
          ))}
        </span>
      </div>
      {last && canLoadSample && <p className="text-xs text-muted-foreground">{t('onboard.sample.hint')}</p>}
      <DialogFooter className="gap-2 sm:justify-between">
        <Button variant="ghost" onClick={onClose} data-testid="tour-skip">
          {t('onboard.skip')}
        </Button>
        <div className="flex gap-2">
          {i > 0 && (
            <Button variant="outline" onClick={() => setI(i - 1)}>
              {t('onboard.back')}
            </Button>
          )}
          {!last && (
            <Button onClick={() => setI(i + 1)} data-testid="tour-next">
              {t('onboard.next')}
            </Button>
          )}
          {last && canLoadSample && (
            <>
              <Button variant="outline" onClick={onClose} data-testid="tour-empty">
                {t('onboard.empty')}
              </Button>
              <Button
                data-testid="tour-sample"
                onClick={() => {
                  store.update((db) => loadSample(db, buildSample(new Date(), (k) => t(k))))
                  onClose()
                }}
              >
                {t('onboard.sample')}
              </Button>
            </>
          )}
          {last && !canLoadSample && (
            <Button onClick={onClose} data-testid="tour-done">
              {t('onboard.done')}
            </Button>
          )}
        </div>
      </DialogFooter>
    </>
  )
}

/** First-run tour for an empty app (offers sample data), and replayable from Settings. */
export function OnboardingTour() {
  const onboarded = useOnboarded()
  const replay = useUi('tour')
  const empty = useDb((db) => db.items.length === 0 && db.areas.length === 0 && db.projects.length === 0)
  const open = replay || (!onboarded && empty)
  const close = () => {
    onboarding.markDone()
    ui.close('tour')
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent data-testid="tour">{open && <Tour canLoadSample={empty} onClose={close} />}</DialogContent>
    </Dialog>
  )
}
