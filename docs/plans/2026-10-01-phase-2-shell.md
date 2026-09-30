# Phase 2 — App shell, i18n, theme, Settings plan

Branch `phase-2-shell`.

| Task | Files | Notes |
|---|---|---|
| 2.1 Shell | `components/app-sidebar.tsx`, `components/app-shell.tsx`, `components/header-timer.tsx` | shadcn `Sidebar` (`collapsible="icon"`), badges, header timer slot |
| 2.2 Routes | `App.tsx`, `screens/*` | `/tasks`, `/plan/:date?`, `/today`, `/settings`; `/` → home setting |
| 2.3 i18n | `i18n/{en,he,index}.tsx` | typed catalogs, `useT()`, `dir`/`lang` on `<html>`, Intl formatting |
| 2.4 Theme | `theme/theme-provider.tsx` | `.dark` class from setting; `system` follows `prefers-color-scheme` |
| 2.5 Settings | `screens/settings.tsx` | every setting in spec §5.5, persisted via `actions.updateSettings` |
| 2.6 Exit | | component tests (i18n/RTL, theme, settings persistence), Playwright screenshots EN/HE × light/dark; merge |
