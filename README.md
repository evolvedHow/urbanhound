# Urban Hound

A hound's journal for well-kept city dogs. Owners log daily diary entries in
the hound's voice, record moods, get a daily treat-time nudge, and play animal
sounds to coax a dog along. It keeps the field walk tracking, retro photo kit,
scrapbook, and ward broadcasts too. A PWA, built to be local-first and fully
deployable to GitHub Pages.

## Structure

| Path | What it is |
|---|---|
| `frontend/` | React 19 + Vite + TypeScript + Tailwind v4 PWA (the mobile app) |
| `backend/` | Optional FastAPI companion (geo, geofence, sessions, broadcasts, artifacts) |

The app is designed to be used standalone: every feature works from a
`localStorage`-persisted store with seeded demo data (photos and short videos
live in IndexedDB so the diary can go on and on without blowing the quota). The
backend is a voluntary sync/archive layer — point `VITE_API_BASE` at it when
you want one.

## Features

- **The Journal** — a dog-voice diary. Tap a pre-filled suggestion, roll
  *Feeling lucky* for a random one, or type your own; tag a mood and attach a
  photo or short video.
- **Moods** — record the hound's mood (zoomies to under the weather) on any
  entry.
- **Treat time** — set a preferred time in Settings; the app nudges you to
  answer whether the treat was given and to rate the hound's happiness.
- **Sound board** — bundled offline audio (bark, howl, meow, purr, tweets,
  squeaks, treat bag…) to grab a hound's attention. Replace the placeholder
  clips under `frontend/public/sounds/` with your own recordings.
- **Walks, camera, scrapbook, broadcasts** — the original field kit remains.

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