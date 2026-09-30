import { Outlet } from 'react-router-dom'
import { AppSidebar } from '@/components/app-sidebar'
import { GlobalKeys } from '@/components/global-keys'
import { ItemDetail } from '@/components/item-detail'
import { ProjectDetail } from '@/components/project-detail'
import { QuickAdd } from '@/components/quick-add'
import { RitualBanner } from '@/components/ritual-banner'
import { SearchDialog } from '@/components/search-dialog'
import { HeaderTimer } from '@/components/header-timer'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useI18n } from '@/i18n'
import { useTimerTicker } from '@/timer/hooks'

export function AppShell() {
  const { t } = useI18n()
  useTimerTicker()
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger aria-label={t('nav.toggle')} />
            <Separator orientation="vertical" className="h-4" />
            <HeaderTimer />
          </header>
          <RitualBanner />
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
      <ItemDetail />
      <ProjectDetail />
      <QuickAdd />
      <SearchDialog />
      <GlobalKeys />
      <Toaster />
    </TooltipProvider>
  )
}
