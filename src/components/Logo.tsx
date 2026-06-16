import { cx } from '@/lib/utils'

export function Logo({ className, showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-2 select-none', className)}>
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent text-white shadow-sm">
        <svg viewBox="0 0 64 64" className="h-4.5 w-4.5" aria-hidden>
          <path
            d="M21.3 24.5c0-4.7 3.7-8.1 9-8.1 5.1 0 8.7 3 8.7 7.5 0 3.2-1.6 5.5-5.9 9.2l-6 5.2h12.2V46H20.5v-4.3l9.8-8.6c3-2.7 3.9-4 3.9-6 0-2.2-1.6-3.7-4-3.7-2.6 0-4.2 1.7-4.2 4.6v.4h-4.7v-.1z"
            fill="currentColor"
          />
          <circle cx="45.5" cy="42.5" r="3.6" fill="#a5b4fc" />
        </svg>
      </span>
      {showWordmark && (
        <span className="text-[17px] font-bold tracking-tight text-ink">
          2<span className="text-accent">DO</span>
        </span>
      )}
    </span>
  )
}
