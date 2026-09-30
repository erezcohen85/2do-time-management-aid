import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

/** Text input that commits on blur / Enter, so typing never fights the store. */
export function DraftInput({
  value, onCommit, ...rest
}: { value: string; onCommit: (v: string) => void } & Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'>) {
  const [draft, setDraft] = useState<string | null>(null)
  const commit = () => {
    if (draft !== null && draft !== value) onCommit(draft)
    setDraft(null)
  }
  return (
    <Input
      {...rest}
      value={draft ?? value}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          commit()
        }
      }}
    />
  )
}

export function DraftTextarea({
  value, onCommit, ...rest
}: { value: string; onCommit: (v: string) => void } & Omit<React.ComponentProps<typeof Textarea>, 'value' | 'onChange'>) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <Textarea
      {...rest}
      value={draft ?? value}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== null && draft !== value) onCommit(draft)
        setDraft(null)
      }}
    />
  )
}

/** Optional number field (empty = undefined), commits on blur. */
export function DraftNumber({
  value, onCommit, ...rest
}: { value: number | undefined; onCommit: (v: number | undefined) => void } & Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'type'>) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <Input
      {...rest}
      type="number"
      value={draft ?? (value === undefined ? '' : String(value))}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== null) {
          const n = draft === '' ? undefined : Number(draft)
          if (n === undefined || Number.isFinite(n)) onCommit(n)
        }
        setDraft(null)
      }}
    />
  )
}
