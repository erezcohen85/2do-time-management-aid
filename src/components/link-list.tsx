import { useState } from 'react'
import { ExternalLink, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { newId } from '@/data/actions'
import { detectLink, normalizeUrl } from '@/domain/links'
import { useI18n } from '@/i18n'
import type { Link } from '@/types'

export function LinkList({ links, onChange }: { links: Link[]; onChange: (l: Link[]) => void }) {
  const { t } = useI18n()
  const [v, setV] = useState('')
  const [invalid, setInvalid] = useState(false)
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        {links.map((l) => {
          const d = detectLink(l.url)
          return (
            <Badge key={l.id} variant="secondary" className="gap-1 py-1" data-testid="link-chip" data-provider={d.provider}>
              <a href={l.url} target="_blank" rel="noreferrer noopener" className="flex items-center gap-1">
                <ExternalLink className="size-3" />
                {l.label || d.label}
              </a>
              <Button
                variant="ghost"
                size="icon"
                className="size-4"
                aria-label={t('common.remove')}
                onClick={() => onChange(links.filter((x) => x.id !== l.id))}
              >
                <X className="size-3" />
              </Button>
            </Badge>
          )
        })}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const url = normalizeUrl(v)
          if (!url) return setInvalid(true)
          onChange([...links, { id: newId(), url }])
          setV('')
          setInvalid(false)
        }}
      >
        <Input
          aria-label={t('d.links.add')}
          placeholder={t('d.links.add')}
          value={v}
          aria-invalid={invalid}
          onChange={(e) => {
            setV(e.target.value)
            setInvalid(false)
          }}
        />
        {invalid && <p className="mt-1 text-xs text-destructive">{t('d.links.invalid')}</p>}
      </form>
    </div>
  )
}
