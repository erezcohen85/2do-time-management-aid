import { useEffect, useState, type ReactNode } from 'react'
import { Check, MousePointer2, Plus } from 'lucide-react'
import { GradeBadge, GradeDot } from '@/components/grade-chips'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useI18n } from '@/i18n'
import { pickLine } from '@/i18n/microcopy'
import { cn } from '@/lib/utils'
import { GRADES } from '@/types'

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Cycles 0..count-1 every `ms`. With reduced motion it rests on the last (finished) frame. */
function useLoop(count: number, ms = 1500): number {
  const [phase, setPhase] = useState(() => (reducedMotion() ? count - 1 : 0))
  useEffect(() => {
    if (reducedMotion()) return
    const id = window.setInterval(() => setPhase((p) => (p + 1) % count), ms)
    return () => window.clearInterval(id)
  }, [count, ms])
  return phase
}

/** A small mouse cursor with a click ripple. Put it inside a `relative` element: it points at that element's corner. */
function Pointer() {
  return (
    <span data-testid="tour-cursor" aria-hidden className="pointer-events-none absolute -bottom-3 -end-2 z-10 size-4 animate-in fade-in zoom-in duration-300">
      <span className="absolute start-0 top-0 size-3 animate-ping rounded-full bg-primary/40" />
      <MousePointer2 className="relative size-4 fill-foreground text-background drop-shadow" />
    </span>
  )
}

const Row = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('flex min-w-0 items-center gap-2 rounded-md border bg-card px-2 py-1.5 text-sm animate-in fade-in slide-in-from-bottom-1 duration-300', className)}>{children}</div>
)

function Stage({ children, id }: { children: ReactNode; id: number }) {
  return (
    <div data-testid={`tour-demo-${id}`} aria-hidden className="h-44 overflow-hidden rounded-lg border bg-muted/40 p-3">
      {children}
    </div>
  )
}

/** 1. Welcome: the four ideas appear one after another. */
function Welcome() {
  const { t } = useI18n()
  const p = useLoop(5, 900)
  const items = [t('onboard.s2.title'), t('onboard.s3.title'), t('onboard.s4.title'), t('onboard.s5.title')]
  return (
    <Stage id={1}>
      <div className="grid gap-2">
        {items.map((label, i) => (
          <div key={label} className={cn('transition-all duration-500', i < p ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0')}>
            <Row>{label}</Row>
          </div>
        ))}
      </div>
    </Stage>
  )
}

/** 2. Capture and grade: a task sits in Ungraded, gets an A, and lands in the A group as A1. */
function Grade() {
  const { t } = useI18n()
  const p = useLoop(3, 1600)
  const title = t('sample.item.bank')
  return (
    <Stage id={2}>
      <div className="grid gap-2">
        <div className="text-xs font-semibold">{t('tm.ungraded')} ({p < 2 ? 1 : 0})</div>
        {p < 2 ? (
          <Row key="inbox">
            <span className="size-4 rounded-[4px] border" />
            <span className="flex-1 truncate">{title}</span>
            <span className="flex rounded-md border">
              {GRADES.map((g) => (
                <span key={g} className={cn('relative flex items-center gap-1 border-s px-2 py-0.5 font-mono text-xs first:border-s-0 transition-colors', p === 1 && g === 'A' && 'bg-accent')}>
                  <GradeDot grade={g} />
                  {g}
                  {p === 1 && g === 'A' && <Pointer />}
                </span>
              ))}
            </span>
          </Row>
        ) : (
          <div className="h-8" />
        )}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <GradeDot grade="A" /> A <span className="font-normal text-muted-foreground">{t('grade.A')}</span>
        </div>
        {p === 2 && (
          <Row key="grouped">
            <span className="w-6 font-mono text-xs text-muted-foreground">A1</span>
            <span className="size-4 rounded-[4px] border" />
            <span className="flex-1 truncate">{title}</span>
            <GradeBadge grade="A" />
          </Row>
        )}
      </div>
    </Stage>
  )
}

/** 3. Plan: items move from candidates onto the timeline; the footer counts up. */
function Plan() {
  const { t, duration } = useI18n()
  const p = useLoop(4, 1500)
  const a = t('sample.item.copy')
  const b = t('sample.item.bank')
  const c = t('sample.item.flights')
  return (
    <Stage id={3}>
      <div className="grid h-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
        <div className="grid content-start gap-1.5">
          <div className="text-xs font-semibold">{t('plan.candidates')}</div>
          {[a, b, c].map((x, i) => (
            <Row key={x} className={cn('transition-opacity duration-500', i < p && i < 2 && 'opacity-30')}>
              <GradeDot grade={i === 0 ? 'A' : i === 1 ? 'A' : 'C'} />
              <span className="min-w-0 flex-1 truncate text-xs">{x}</span>
              <span className="relative flex size-5 shrink-0 items-center justify-center rounded-md">
                <Plus className="size-3.5" />
                {p === i && i < 2 && <Pointer />}
              </span>
            </Row>
          ))}
        </div>
        <div className="grid min-w-0 content-start gap-1.5">
          <div className="text-xs font-semibold">Fri 02 Oct</div>
          {p >= 1 && (
            <div className="flex min-w-0 items-center gap-2" key="b1">
              <span className="w-10 shrink-0 font-mono text-[10px] text-muted-foreground">08:30</span>
              <Row className="min-w-0 flex-1"><span className="truncate text-xs">{a}</span><span className="ms-auto shrink-0 font-mono text-[10px]">{duration(120)}</span></Row>
            </div>
          )}
          {p >= 2 && (
            <div className="flex min-w-0 items-center gap-2" key="b2">
              <span className="w-10 shrink-0 font-mono text-[10px] text-muted-foreground">10:30</span>
              <Row className="min-w-0 flex-1"><span className="truncate text-xs">{b}</span><span className="ms-auto shrink-0 font-mono text-[10px]">{duration(20)}</span></Row>
            </div>
          )}
          {p >= 3 && (
            <div className="flex items-center gap-2 border-t pt-1.5 text-xs animate-in fade-in" key="foot">
              <span className="font-semibold">2/6</span>
              <span>{t('plan.footer.planned', { time: duration(140) })}</span>
              <Check className="size-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">{t('plan.footer.fits')}</span>
            </div>
          )}
        </div>
      </div>
    </Stage>
  )
}

/** 4. Today: the now line moves, items get ticked, the timer runs. */
function Today() {
  const { t, lang } = useI18n()
  const p = useLoop(4, 1500)
  const rows = [t('sample.item.copy'), t('sample.item.bank'), t('sample.item.review')]
  const current = Math.min(Math.max(p - 0, 0), 2)
  const digits = ['25:00', '24:12', '23:24', '22:36'][p]
  return (
    <Stage id={4}>
      <div className="grid h-full grid-cols-[1fr_auto] gap-3">
        <div className="grid content-start gap-1.5">
          {rows.map((x, i) => (
            <div key={x} className="grid gap-1.5">
              {i === current && (
                <div className="flex items-center gap-2 text-[10px] text-now-line animate-in fade-in">
                  <span className="h-px flex-1 bg-now-line" />
                  <span className="font-semibold uppercase">{t('today.now')}</span>
                </div>
              )}
              <Row className={cn(i === current && 'border-primary ring-1 ring-primary', i < current && 'bg-block-done text-muted-foreground')}>
                <span className={cn('relative flex size-4 items-center justify-center rounded-[4px] border', i < current && 'bg-primary text-primary-foreground')}>
                  {i < current && <Check className="size-3" />}
                  {i === current && p < 3 && <Pointer />}
                </span>
                <span className={cn('flex-1 truncate text-xs', i < current && 'line-through')}>{x}</span>
                {i === current && <Badge className="text-[10px]">{t('today.current')}</Badge>}
              </Row>
            </div>
          ))}
        </div>
        <div className="grid w-28 content-center justify-items-center gap-1 rounded-md border bg-card p-2 text-center">
          <span className="text-[10px] text-muted-foreground">{t('timer.phase.work')}</span>
          <span className="font-mono text-2xl tabular-nums">{digits}</span>
          <span className="text-[10px] italic text-muted-foreground">“{pickLine(lang, p === 0 ? 'start' : 'running', 1, p)}”</span>
        </div>
      </div>
    </Stage>
  )
}

/** 5. Review: day scores fill in, a project progress bar grows, a reflection appears. */
function Review() {
  const { t, weekdayName } = useI18n()
  const p = useLoop(4, 1400)
  const scores = ['5/6', '6/6', '3/6', '4/6', '–']
  const bars = [20, 45, 70, 85]
  return (
    <Stage id={5}>
      <div className="grid gap-2.5">
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((d, i) => (
            <div key={d} className={cn('grid min-w-12 justify-items-center rounded-md border bg-card px-1.5 py-1 transition-opacity duration-500', i <= p ? 'opacity-100' : 'opacity-25')}>
              <span className="text-[10px] text-muted-foreground">{weekdayName(d, 'short')}</span>
              <span className="font-mono text-xs">{scores[i]}</span>
            </div>
          ))}
        </div>
        <div className="grid gap-1">
          <div className="flex items-center gap-2 text-xs"><span className="font-medium">{t('sample.project.launch')}</span><span className="text-muted-foreground">{bars[p]}%</span></div>
          <Progress value={bars[p]} className="transition-all" />
        </div>
        <div className="grid gap-1 text-xs">
          <span className="font-medium">{t('review.wentWell')}</span>
          <div className="h-2 rounded bg-border" style={{ width: `${40 + p * 15}%`, transition: 'width 500ms' }} />
          <div className="h-2 rounded bg-border" style={{ width: `${20 + p * 12}%`, transition: 'width 500ms' }} />
        </div>
        {p < 3 ? (
          <span className="relative w-fit">
            <Button size="sm" className="h-7 text-xs" tabIndex={-1}>
              <Check /> {t('review.complete')}
            </Button>
            {p === 2 && <Pointer />}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-muted-foreground animate-in fade-in">
            <Check className="size-3.5" /> {t('review.completed')}
          </span>
        )}
      </div>
    </Stage>
  )
}

const DEMOS = [Welcome, Grade, Plan, Today, Review]

export function TourDemo({ step }: { step: number }) {
  const D = DEMOS[step]
  return <D key={step} />
}
