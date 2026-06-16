import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu as MenuIcon, Plus, Search, X } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Logo } from './Logo'
import { QuickAdd } from './QuickAdd'
import { SearchModal } from './SearchModal'
import { cx } from '@/lib/utils'

export interface ShellContext {
  openQuickAdd: () => void
  openSearch: () => void
}

export function AppShell() {
  const [navOpen, setNavOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  // global shortcuts: ⌘K / Ctrl+K = search, ⌘⇧A / Ctrl+⇧A = quick add
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      } else if (mod && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        setQuickAddOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const ctx: ShellContext = {
    openQuickAdd: () => setQuickAddOpen(true),
    openSearch: () => setSearchOpen(true),
  }

  return (
    <div className="flex h-[100svh] overflow-hidden bg-canvas">
      {/* desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-line lg:block">
        <Sidebar />
      </aside>

      {/* mobile drawer */}
      {navOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/30" onClick={() => setNavOpen(false)} />
          <div className="animate-pop absolute inset-y-0 left-0 w-72 max-w-[85%] border-r border-line shadow-xl">
            <button
              onClick={() => setNavOpen(false)}
              className="absolute top-4 right-3 grid h-7 w-7 place-items-center rounded-lg text-ink-faint hover:bg-line-soft"
            >
              <X className="h-4 w-4" />
            </button>
            <Sidebar onNavigate={() => setNavOpen(false)} />
          </div>
        </div>
      )}

      {/* main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-3 lg:px-4">
          <button
            onClick={() => setNavOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-lg text-ink-soft hover:bg-line-soft lg:hidden"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <div className="lg:hidden">
            <Logo showWordmark={false} />
          </div>

          <button
            onClick={() => setSearchOpen(true)}
            className="group ml-1 flex h-9 flex-1 items-center gap-2 rounded-lg border border-line bg-canvas px-3 text-sm text-ink-faint transition-colors hover:border-line-strong lg:max-w-sm"
          >
            <Search className="h-4 w-4" />
            <span>Search…</span>
            <kbd className="ml-auto hidden rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] font-medium text-ink-faint lg:inline">
              ⌘K
            </kbd>
          </button>

          <div className="flex-1 lg:hidden" />

          <button
            onClick={() => setQuickAddOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent-hover"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New task</span>
          </button>
        </header>

        <main className={cx('min-h-0 flex-1')}>
          <Outlet context={ctx} />
        </main>
      </div>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <QuickAdd open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
    </div>
  )
}
