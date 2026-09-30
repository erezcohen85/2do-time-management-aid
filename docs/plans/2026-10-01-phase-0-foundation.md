# Phase 0 — Foundation (scaffold) plan

Tasks 0.1–0.5 are done (see vault Progress). This plan covers 0.6–0.9 on branch `phase-0-foundation`.

## 0.6 Fresh scaffold
- Delete v1 `src/`, recreate `src/main.tsx`, `src/App.tsx`, `src/index.css`.
- Drop unused deps (`@supabase/supabase-js`, `@tanstack/react-query`); keep react, router, dnd-kit, date-fns, lucide.
- Update `index.html` (no Google Fonts, no indigo theme-color).
- Verify: `npm run build`, `npm run lint`.

## 0.7 shadcn init (new-york, neutral)
- Write `components.json` per Design System §1, install `class-variance-authority clsx tailwind-merge tw-animate-css radix-ui`.
- `src/lib/utils.ts` with `cn`.
- `src/index.css` with tokens from Design System §2 + §3 and `@theme inline` block.
- `npx shadcn@latest add button -y` to prove the CLI path works.

## 0.8 Test tooling
- Vitest + jsdom + Testing Library (`vitest.config` via vite config `test` block, setup file).
- Playwright with chromium; `playwright.config.ts` starts the dev server; one smoke test.
- Scripts: `test`, `test:watch`, `test:e2e`. Update CLAUDE.md Commands.

## 0.9 Exit
- `npm run build`, `lint`, `test` green; e2e smoke green. Merge to `main` with `--no-ff`, push.
