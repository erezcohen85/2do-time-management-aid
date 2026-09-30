import { useEffect } from 'react'
import { ui } from '@/lib/ui-store'

/** ⌘K search, ⌘⇧A quick add (Ctrl on non-Mac). */
export function GlobalKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      const k = e.key.toLowerCase()
      if (k === 'k' && !e.shiftKey) {
        e.preventDefault()
        ui.set('search', true)
      } else if (k === 'a' && e.shiftKey) {
        e.preventDefault()
        ui.set('quickAdd', true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return null
}
