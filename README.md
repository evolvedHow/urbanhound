# Urban Hound

Field walk tracking, a retro photo kit, a daily vibe check, and ward broadcasts
for well-kept city hounds. A PWA, built to be local-first and fully deployable
to GitHub Pages.

## Structure

| Path | What it is |
|---|---|
| `frontend/` | React 19 + Vite + TypeScript + Tailwind v4 PWA (the mobile app) |
| `backend/` | Optional FastAPI companion (geo, geofence, sessions, broadcasts, artifacts) |

The app is designed to be used standalone: every feature works from a
`localStorage`-persisted store with seeded demo data. The backend is a
voluntary sync/archive layer — point `VITE_API_BASE` at it when you want one.

## Frontend

```sh
cd frontend
npm install

npm run dev       # local dev server
npm run lint      # oxlint
npm run build     # tsc + vite build (outputs dist/)
npm run deploy    # builds and publishes to GitHub Pages
```

Routing uses `HashRouter` and `vite.config.ts` sets `base: '/urbanhound/'` to
match the GitHub repository name, so the static host needs no SPA fallback.

To enable backend sync, provide an API base at build time:

```sh
VITE_API_BASE=https://your-fastapi-host.app npm run build
```

## Backend

```sh
cd backend
uv sync
uv run uvicorn app.main:app --reload
```

`uv run pytest -q` runs the test suite (28 passing). OpenAPI docs are served at
`/docs` when the app is running.

## Design

- **Look:** analog scrapbook — aged paper, ink, sepia, teal, mustard, brick.
  Fraunces (display serif), Instrument Sans (body), Courier Prime (typewriter).
- **Voice:** refined, dry, affectionate. A well-mannered city hound narrating
  the day — never over the top.
- **Breakpoints:** 375 / 768 / 1024; touch targets 44×44px minimum.