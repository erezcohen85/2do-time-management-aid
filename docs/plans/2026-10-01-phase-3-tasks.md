# Phase 3 — Task Manager and item detail plan

Branch `phase-3-tasks`. Detail panel state lives in the URL (`?item=<id>` / `?project=<id>`) so it opens from any screen.

| Task | Files | Notes |
|---|---|---|
| 3.1 By Grade + drag rank | `screens/task-manager.tsx`, `components/by-grade.tsx`, `components/item-row.tsx`, `components/grade-chips.tsx` | dnd-kit sortable per grade; drop onto another grade regrades |
| 3.2 By Project + CRUD | `components/by-project.tsx` | Area → Project tree; add / rename / delete via dropdown + inline input; loose tasks bucket |
| 3.3 Ungraded inbox | in both views | one-click `ToggleGroup` A–E |
| 3.4 Detail panel | `components/item-detail.tsx`, `components/due-picker.tsx` | `Sheet` (side flips in RTL): title, grade, estimate, due, notes, done, delete |
| 3.5 SMART | `components/smart-fields.tsx` | toggle, 5 inline fields, Measurable numeric + `Progress`, badge `SMART n/5` |
| 3.6 Subtasks, checklist, links, waiting-on | `item-detail.tsx`, `domain/links.ts` | provider detection chips, blocker picker |
| 3.7 ⌘K search + ⌘⇧A quick add | `components/search-dialog.tsx`, `components/quick-add.tsx`, `components/global-keys.tsx` | |
| 3.8 Exit | | component tests, e2e, screenshots EN/HE, merge |
