# 2DO

Personal daily time-management app: ABCDE grading, Ivy Lee daily list, Today workspace with a timer, Thursday weekly review, optional Google Calendar sync. Desktop web, data in `localStorage` (key `2do.db.v2`), English and Hebrew (RTL), light/dark.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build
npm run lint
npm test           # Vitest (unit + component)
npm run test:e2e   # Playwright (starts its own dev server on :5199, Google stubbed)
```

First time only: `npx playwright install chromium`.

## Google Calendar setup (optional)

1. In Google Cloud Console create a project and enable the **Google Calendar API**.
2. Configure the OAuth consent screen (External, add yourself as a test user).
3. Create credentials, **OAuth client ID**, type **Web application**. Add `http://localhost:5173` under **Authorized JavaScript origins**.
4. Copy `.env.example` to `.env.local` and set `VITE_GOOGLE_CLIENT_ID=<your client id>`.
5. Restart `npm run dev`, open Settings, **Connect Google Calendar**.

Scopes requested: read calendar list, read events, and manage only the calendar the app creates ("2DO").

## Layout

`src/domain` pure rules (scheduler, caps, leftovers, scoring, weeks, drift, ritual) · `src/data` store and pure mutations · `src/timer` timer state machine · `src/integrations/gcal` Google client, sync diff, service · `src/screens`, `src/components` UI · `src/i18n` EN/HE catalogs.
