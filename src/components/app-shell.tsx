import { Outlet } from 'react-router-dom'
import { AppSidebar } from '@/components/app-sidebar'
import { HeaderTimer } from '@/components/header-timer'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useI18n } from '@/i18n'

export function AppShell() {
  const { t } = useI18n()
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
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
      <Toaster />
    </TooltipProvider>
  )
}
