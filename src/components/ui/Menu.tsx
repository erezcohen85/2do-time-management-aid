import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cx } from '@/lib/utils'

export interface MenuItem {
  label: string
  icon?: ReactNode
  onClick: () => void
  danger?: boolean
}

export function Menu({
  trigger,
  items,
  align = 'right',
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode
  items: MenuItem[]
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          className={cx(
            'animate-pop absolute z-30 mt-1 min-w-44 overflow-hidden rounded-xl bg-surface py-1 shadow-xl ring-1 ring-line',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => {
                setOpen(false)
                item.onClick()
              }}
              className={cx(
                'flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition-colors',
                item.danger
                  ? 'text-danger hover:bg-danger/5'
                  : 'text-ink-soft hover:bg-line-soft hover:text-ink',
              )}
            >
              {item.icon && <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
