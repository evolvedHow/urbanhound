"""Runtime configuration for the Urban Hound API."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-driven settings for the API service.

    Attributes:
        app_name: Human readable service name used in OpenAPI metadata.
        api_prefix: Base path under which every versioned route is mounted.
        cors_origins: Origins permitted to call the API from a browser.
        max_accuracy_radius_meters: Fixes with worse accuracy are discarded.
        max_velocity_mps: Implied velocities above this are treated as noise.
        telemetry_timeout_seconds: Silence before a session is marked stalled.
        default_broadcast_radius_meters: Fallback alert radius for a subject.
    """

    model_config = SettingsConfigDict(env_prefix="URBANHOUND_", env_file=".env")

    app_name: str = "Urban Hound API"
    api_prefix: str = "/api/v1"
    cors_origins: list[str] = ["*"]
    max_accuracy_radius_meters: float = 50.0
    max_velocity_mps: float = 33.3
    telemetry_timeout_seconds: int = 900
    default_broadcast_radius_meters: int = 5000


@lru_cache
def get_settings() -> Settings:
    """Return a cached :class:`Settings` instance.

    Returns:
        The process-wide settings object.
    """
    return Settings()
