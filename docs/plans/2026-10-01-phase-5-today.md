# Phase 5 — Today and Timer plan

Branch `phase-5-today`.

| Task | Files | Notes |
|---|---|---|
| 5.1 Today timeline, now line, drift | `screens/today.tsx`, `domain/drift.ts` (TDD) | reuses `Timeline` with `nowMin`; header `n/m done · ⚠ 20m behind` |
| 5.2 Tick + soft-order nudge; carry-over pool | `screens/today.tsx`, `components/carryover-pool.tsx` | hard order disables all but top unfinished; soft order toasts a nudge; pool quick-adds subject to cap |
| 5.3 Timer engine (4 modes), survives reload | `timer/engine.ts`, `timer/controller.ts` (TDD) | pure state machine, persisted in `db.timer`, display derived from timestamps |
| 5.4 Timer UI + presets | `components/timer-panel.tsx` | `Tabs` for modes, presets select, start/pause/stop |
| 5.5 Item tagging + session log | controller + panel | one `TimerSession` per focused run segment, tagged or untagged |
| 5.6 Sound + browser notification | `timer/alerts.ts` | WebAudio beep, Notification API, both gated by settings |
| 5.7 Microcopy pools EN/HE + header mini-timer | `i18n/microcopy.ts`, `components/header-timer.tsx` | rotating pools per state |
| 5.8 Exit | | tests, e2e, screenshots, merge |
