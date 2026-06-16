import { Check } from 'lucide-react'
import { cx } from '@/lib/utils'

export function Checkbox({
  checked,
  onChange,
  size = 'md',
}: {
  checked: boolean
  onChange: () => void
  size?: 'sm' | 'md'
}) {
  const dim = size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]'
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation()
        onChange()
      }}
      className={cx(
        'grid shrink-0 place-items-center rounded-full border transition-all',
        dim,
        checked
          ? 'border-accent bg-accent text-white'
          : 'border-line-strong border-[1.5px] text-transparent hover:border-accent',
      )}
      style={!checked ? { borderColor: '#cfcfd8' } : undefined}
    >
      <Check className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} strokeWidth={3.5} />
    </button>
  )
}
