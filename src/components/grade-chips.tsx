import { Badge } from '@/components/ui/badge'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n'
import { GRADES, type Grade } from '@/types'

const DOT: Record<Grade, string> = {
  A: 'bg-grade-a',
  B: 'bg-grade-b',
  C: 'bg-grade-c',
  D: 'bg-grade-d',
  E: 'bg-grade-e',
}

export function GradeDot({ grade, className }: { grade: Grade; className?: string }) {
  return <span aria-hidden className={cn('inline-block size-2 shrink-0 rounded-full', DOT[grade], className)} />
}

export function GradeBadge({ grade }: { grade: Grade }) {
  return (
    <Badge variant="outline" className="gap-1.5 font-mono">
      <GradeDot grade={grade} />
      {grade}
    </Badge>
  )
}

/** One-click A–E picker. Clicking the active grade clears it when `allowClear`. */
export function GradePicker({
  value, onChange, allowClear = false, size = 'sm',
}: { value: Grade | null; onChange: (g: Grade | null) => void; allowClear?: boolean; size?: 'sm' | 'default' }) {
  const { t } = useI18n()
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size={size}
      value={value ?? ''}
      onValueChange={(v) => {
        if (v) onChange(v as Grade)
        else if (allowClear) onChange(null)
      }}
      aria-label={t('d.grade')}
    >
      {GRADES.map((g) => (
        <ToggleGroupItem
          key={g}
          value={g}
          aria-label={t('grade.label', { grade: g, name: t(`grade.${g}`) })}
          title={t(`grade.${g}`)}
          className="gap-1.5 font-mono"
        >
          <GradeDot grade={g} />
          {g}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
