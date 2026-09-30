import { CalendarDays, X } from 'lucide-react'
import { he as heLocale, enUS } from 'react-day-picker/locale'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useDb } from '@/data/hooks'
import { formatDate, parseDate } from '@/domain/time'
import { useI18n } from '@/i18n'
import type { DateStr } from '@/types'

export function DuePicker({
  value, onChange, id, label,
}: { value: DateStr | undefined; onChange: (d: DateStr | undefined) => void; id?: string; label?: string }) {
  const { t, fmt, lang, dir } = useI18n()
  const weekStart = useDb((db) => db.settings.weekStart) as 0 | 1 | 2 | 3 | 4 | 5 | 6
  return (
    <div className="flex items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button id={id} variant="outline" className="w-48 justify-start gap-2 font-normal" aria-label={label}>
            <CalendarDays className="size-4" />
            {value ? fmt(parseDate(value), { dateStyle: 'medium' }) : <span className="text-muted-foreground">{t('d.due.none')}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            dir={dir}
            locale={lang === 'he' ? heLocale : enUS}
            weekStartsOn={weekStart}
            selected={value ? parseDate(value) : undefined}
            defaultMonth={value ? parseDate(value) : undefined}
            onSelect={(d) => d && onChange(formatDate(d))}
          />
        </PopoverContent>
      </Popover>
      {value && (
        <Button variant="ghost" size="icon" aria-label={t('d.due.clear')} onClick={() => onChange(undefined)}>
          <X />
        </Button>
      )}
    </div>
  )
}
