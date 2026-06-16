import { useEffect, type ReactNode } from 'react'
import { cx } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** align to top (command-palette style) vs center */
  align?: 'top' | 'center'
  className?: string
}

export function Modal({ open, onClose, children, align = 'center', className }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className={cx(
        'fixed inset-0 z-50 flex justify-center bg-ink/20 px-4 backdrop-blur-[2px]',
        align === 'top' ? 'items-start pt-[12vh]' : 'items-center',
      )}
      onMouseDown={onClose}
    >
      <div
        className={cx(
          'animate-pop w-full max-w-lg overflow-hidden rounded-2xl bg-surface shadow-2xl ring-1 ring-line',
          className,
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
