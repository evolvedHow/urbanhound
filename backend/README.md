# Urban Hound API

FastAPI backend for the Urban Hound companion app: GPS walk telemetry,
geofence evaluation with grace periods, retro photo artifacts, the Daily Vibe
Check, the whimsical status generator, and emergency neighborhood broadcasts.

## Run

```zsh
uv sync
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Interactive docs are served at `http://127.0.0.1:8000/docs`.

## Test

```zsh
uv run pytest
uv run ruff check .
uv run ruff format --check .
```

## Layout

- `app/models.py` — Pydantic domain entities and enums.
- `app/schemas.py` — versioned request and response contracts.
- `app/services/` — geo, geofence, vibe, humor, session FSM, and broadcast logic.
- `app/routers/` — HTTP routers mounted under `/api/v1`.
- `app/store.py` — thread-safe in-memory repository with a demo seed.
