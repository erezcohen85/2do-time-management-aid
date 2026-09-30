import { NavLink, useLocation } from 'react-router-dom'
import { CalendarRange, ListTodo, Settings, Timer } from 'lucide-react'
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu,
  SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarRail,
} from '@/components/ui/sidebar'
import { useDb } from '@/data/hooks'
import { score } from '@/domain/plan'
import { todayStr } from '@/domain/time'
import { useI18n, type MessageKey } from '@/i18n'

const NAV: { to: string; key: MessageKey; icon: typeof ListTodo; id: string }[] = [
  { to: '/tasks', key: 'nav.tasks', icon: ListTodo, id: 'tasks' },
  { to: '/plan', key: 'nav.plan', icon: CalendarRange, id: 'plan' },
  { to: '/today', key: 'nav.today', icon: Timer, id: 'today' },
  { to: '/settings', key: 'nav.settings', icon: Settings, id: 'settings' },
]

export function AppSidebar() {
  const { t, dir } = useI18n()
  const { pathname } = useLocation()
  const plans = useDb((db) => db.plans)
  const today = score(plans[todayStr()])

  return (
    <Sidebar collapsible="icon" side={dir === 'rtl' ? 'right' : 'left'}>
      <SidebarHeader>
        <div className="px-2 py-1 text-lg font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
          {t('app.name')}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map(({ to, key, icon: Icon, id }) => (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(to)} tooltip={t(key)}>
                    <NavLink to={to} data-testid={`nav-${id}`}>
                      <Icon />
                      <span>{t(key)}</span>
                    </NavLink>
                  </SidebarMenuButton>
                  {id === 'today' && today.total > 0 && (
                    <SidebarMenuBadge data-testid="today-badge">
                      {today.done}/{today.total}
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
