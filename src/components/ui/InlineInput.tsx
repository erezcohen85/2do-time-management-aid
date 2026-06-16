import { useEffect, useRef, useState } from 'react'
import { cx } from '@/lib/utils'

/** A focused text input that confirms on Enter/blur and cancels on Escape. */
export function InlineInput({
  initial = '',
  placeholder,
  onCommit,
  onCancel,
  className,
}: {
  initial?: string
  placeholder?: string
  onCommit: (value: string) => void
  onCancel?: () => void
  className?: string
}) {
  const [value, setValue] = useState(initial)
  const ref = useRef<HTMLInputElement>(null)
  const committed = useRef(false)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  const commit = () => {
    if (committed.current) return
    committed.current = true
    const v = value.trim()
    if (v) onCommit(v)
    else onCancel?.()
  }

  return (
    <input
      ref={ref}
      value={value}
      placeholder={placeholder}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          commit()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          committed.current = true
          onCancel?.()
        }
      }}
      className={cx(
        'w-full rounded-md border border-accent/40 bg-surface px-2 py-1 text-sm text-ink outline-none ring-2 ring-accent/15',
        className,
      )}
    />
  )
}
