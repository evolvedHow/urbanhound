"""FastAPI application entrypoint for the Urban Hound API."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.config import get_settings
from app.routers import (
    export,
    geofences,
    incidents,
    meta,
    photos,
    sessions,
    subjects,
    telemetry,
    users,
)
from app.store import seed_store


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Seed the demo dataset on startup.

    Args:
        app: The application being started.

    Yields:
        Control back to the server for the duration of its lifetime.
    """
    seed_store()
    yield


def create_app() -> FastAPI:
    """Build and configure the FastAPI application.

    Returns:
        A fully wired :class:`FastAPI` instance.
    """
    settings = get_settings()
    application = FastAPI(
        title=settings.app_name,
        version=__version__,
        summary=(
            "Field walk telemetry, spatial geofencing, retro media, and "
            "neighborhood broadcasts for the Urban Hound companion app."
        ),
        lifespan=lifespan,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    for router in (
        users.router,
        subjects.router,
        geofences.router,
        sessions.router,
        telemetry.router,
        photos.router,
        incidents.router,
        export.router,
        meta.router,
    ):
        application.include_router(router, prefix=settings.api_prefix)

    @application.get("/health", tags=["system"])
    def health() -> dict[str, str]:
        """Report service liveness.

        Returns:
            A minimal status payload.
        """
        return {"status": "ok", "version": __version__}

    return application


app = create_app()
