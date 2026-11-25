# Realtime Hub Frontend

A focused football match hub built with **React**, **TypeScript**, **Vite**, and **Tailwind CSS**.

## Design System & Foundations

- **Color palette** (`src/styles/tokens.css`, `src/lib/tokens.ts`):
  - Canvas `#0B100E`, Surface `#121A16`, Raised Surface `#19231E`, Border `#2A3730`
  - Text `#F2F6F3`, Muted Text `#A0ADA5`, Accent `#B9F36A`
  - Scheduled `#9DB8FF`, Finished `#A0ADA5`, Error `#FF8178`, Success `#72D6A0`
- **Typography**: Inter (`@fontsource/inter`) with strict `tabular-nums` on scores, kickoff times, match minutes, and timestamps.
- **Layout & Motion**: 4 px spacing scale, 1200 px max width, 10 px card/control radius, full pill badges, 150–200 ms transitions honoring `prefers-reduced-motion`.
- **Status Integrity**: OpenFootball fixtures are never marked **Live** or inferred as live from kickoff time. Live badges are reserved strictly for verified real-time score sources.

## Pages & Components

- **Overview (`/`)**: `Match hub` header with socket transport state, primary panel for today's Premier League fixtures, and secondary panel for recent saved matches.
- **Fixtures (`/fixtures`)**: Date navigation, conditional competition selector when multiple leagues are enabled, `Data updated …` timestamp, and match rows grouped by date, competition, and matchday.
- **Matches (`/matches`)**: Saved match directory with search and status filtering linking to detail views.
- **Match Detail (`/matches/:id`)**: Match score/kickoff header, chronological `CommentaryFeed` timeline with non-color-only event labels, and automatic WebSocket `subscribe` / `unsubscribe` channel lifecycle.
- **Reusable Core**: `AppShell`, `ConnectionIndicator`, `StatusBadge`, `MatchRow` (link only when detail exists), `MatchRowSkeleton`, `SettingsModal`, and `StateFeedback`.

## Backend Integration

### HTTP

- `GET /football/fixtures/today`
- `GET /matches?limit=20`
- `GET /matches/:id/commentary?limit=100`

### WebSocket (`/ws`)

- Subscribes to `{ "type": "subscribeFixtures", "league": 39 }` on open (and resubscribes on reconnect with exponential backoff).
- Handles `welcome`, `subscribedFixtures`, `fixturesSnapshot`, `fixturesUpdated`, `matchCreated`, `commentary`, and `error` messages.
- Subscribes to `{ "type": "subscribe", "matchId": <id> }` while a Match Detail view is open and sends `unsubscribe` on exit.

## Development & Verification

```bash
npm install
npm run dev        # Vite dev server (proxies /football, /matches, /ws to VITE_BACKEND_URL or http://localhost:3000)
npm run typecheck  # TypeScript check
npm test           # Vitest unit & integration suite
npm run build      # Production build
```

Optional environment variables:

- `VITE_BACKEND_URL` — Vite dev proxy target (default `http://localhost:3000`)
- `VITE_API_BASE_URL` — Explicit HTTP API base URL (use `/api` on Vercel to proxy via `vercel.json` and avoid cross-origin CORS issues)
- `VITE_WS_URL` — Explicit WebSocket URL (default resolves `/ws` from `window.location`)

## Vercel Deployment

`vercel.json` includes SPA fallback routing and an `/api/:path*` rewrite proxy to `https://realtime-hub-backend.onrender.com/:path*`. Set these environment variables in Vercel:

- `VITE_API_BASE_URL=/api`
- `VITE_WS_URL=wss://realtime-hub-backend.onrender.com/ws`
