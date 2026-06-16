# 2DO

> Everything you've got 2DO — organized by **Area → Project → Task → Subtask**.

A clean, minimal personal to-do app. Group your life into **Areas**, break them
into **Projects**, fill them with checkable **Tasks**, expand complex ones into
**Subtasks** (each with its own mini-checklist and a gentle "waiting on"
dependency), attach **links** to Google Drive / Docs / Forms, and see what's due
on the **Dashboard**.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

That's it. 2DO works **immediately** with local browser storage — no account
needed. Your data lives in `localStorage` under `2do.db.v1`.

```bash
npm run build    # type-check + production build
npm run preview  # preview the production build
```

## Features (Phase 1)

- **Sidebar tree** — Areas (collapsible) → Projects, with inline rename, add, delete.
- **Tasks** — title, description, notes, due date, reminder; drag to reorder;
  completed section.
- **Subtasks** — one level under a task, each with its own checklist and an
  optional "waiting on another subtask" tag (shows when the prerequisite is open).
- **Links** — paste any URL; the provider (Docs / Sheets / Slides / Forms / Drive)
  is auto-detected. Toggle between **rich chips** and a **plain list**.
- **Dashboard** — cross-project **Overdue / Today / Upcoming**, global **search**
  (`⌘K`), and **quick add** (`⌘⇧A`).
- **Responsive** — full experience on desktop; lightweight browse/add/check on mobile.

## Architecture

- **React + TypeScript + Vite**, **Tailwind CSS v4**, **React Router**, **dnd-kit**.
- All UI reads from a single reactive store (`src/data/store.ts`) via
  `useSyncExternalStore` (`src/data/hooks.ts`). The store today persists to
  `localStorage`; its mutation surface is intentionally backend-agnostic so a
  **Supabase** adapter can replace it without touching the UI.

## Enabling cloud sync + Google sign-in (next phase)

The schema and client are already in place:

1. Create a Supabase project. In **SQL editor**, run
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
   (full schema + Row-Level Security).
2. Enable the **Google** auth provider in Supabase → Authentication → Providers.
3. Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY`. The client in `src/lib/supabase.ts` auto-enables
   when these are present (`isCloudEnabled`).
4. Swap the active store implementation for a Supabase-backed adapter that
   implements the same methods (areas/projects/tasks/subtasks/checklist/links).

## Roadmap

- **Phase 2** — Project whiteboards (tldraw): sticky notes, magnetic connectors,
  freehand, images, alignment; canvases standalone or assigned to a task;
  stickies linkable to a task/subtask.
- **Phase 3** — Reminders (browser push + email) and the Google Drive file picker.
