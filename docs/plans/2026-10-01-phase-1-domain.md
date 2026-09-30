# Phase 1 — Data and domain core plan

Branch `phase-1-domain`. Test-first for every `domain/` module; `data/` mutations are pure reducers `(db, ...args) => db`, bound to the store by `actions`.

| Task | Files | Notes |
|---|---|---|
| 1.1 Types | `src/types/index.ts` | Spec §8 + `Settings`, `Db`, defaults in `src/data/defaults.ts` |
| 1.2 Store | `src/data/{persistence,store,mutations,hooks}.ts` (+ tests) | key `2do.db.v2`; `useSyncExternalStore`; load merges defaults |
| 1.3 items | `src/domain/{time,items}.ts` | leaf, blocked, grade ranking/reorder, SMART count |
| 1.4 schedule | `src/domain/schedule.ts` | auto-stack, pins, calendar events, overflow |
| 1.5 plan | `src/domain/plan.ts` | cap/order, leftovers, candidates, score |
| 1.6 week | `src/domain/week.ts` | week start, visible days, flip, week number |
| 1.7 review | `src/domain/review.ts` | review-block insertion, scorecard |
| 1.8 Exit | | build, lint, test green; merge |
