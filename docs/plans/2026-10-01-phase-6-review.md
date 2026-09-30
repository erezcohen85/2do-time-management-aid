# Phase 6 — Weekly review and rituals plan

Branch `phase-6-review`.

| Task | Files | Notes |
|---|---|---|
| 6.1 Review block auto-insert | `components/use-review-block.ts`, `domain/review.ts` (+`reviewDateOfWeek`) | inserted once per week on the review day for today/future dates, rank #1, pinned at review time, movable |
| 6.2 Scorecard | `components/review-panel.tsx` | per-day scores, full days, timer minutes (tagged/untagged), done per grade |
| 6.3 Active-projects walk + reflection | `components/review-panel.tsx`, mutation `completeReview` | SMART progress, re-grade, carried-over items, note per project per week; reflection saved per week; complete ticks the block |
| 6.4 Planning reminder | `domain/ritual.ts` (TDD), `components/ritual-banner.tsx`, sidebar dot | in-tab banner + browser notification, opens the target day |
| 6.5 Exit | | tests, e2e (capture → grade → plan → tick → Thursday review), merge |
