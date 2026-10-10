"""Daily Vibe Check projection for a walking subject."""

from pydantic import BaseModel


class VibeProjection(BaseModel):
    """A whimsical projection of how a walk is going.

    Attributes:
        headline: Short human-readable summary of the state.
        energy_pct: Percentage weighting toward high energy.
        couch_pct: Percentage weighting toward resting.
        tags: Optional descriptive tags derived from the telemetry.
    """

    headline: str
    energy_pct: int
    couch_pct: int
    tags: list[str]


def _clamp(value: int, low: int = 0, high: int = 100) -> int:
    """Clamp an integer into an inclusive range.

    Args:
        value: The value to clamp.
        low: Inclusive lower bound.
        high: Inclusive upper bound.

    Returns:
        The clamped value.
    """
    return max(low, min(high, value))


def project_vibe(
    distance_meters: float,
    duration_seconds: float,
    stop_count: int,
) -> VibeProjection:
    """Project a subject's vibe from distance, time and stop telemetry.

    Args:
        distance_meters: Total distance travelled during the walk.
        duration_seconds: Elapsed wall-clock duration in seconds.
        stop_count: Number of distinct stationary pauses detected.

    Returns:
        A :class:`VibeProjection` describing the projected mood.
    """
    duration_minutes = duration_seconds / 60.0
    if duration_seconds:
        avg_kmh = (distance_meters / 1000.0) / (duration_seconds / 3600.0)
    else:
        avg_kmh = 0.0
    stop_ratio = stop_count / max(duration_minutes, 1.0)

    tags: list[str] = []
    if avg_kmh > 3.0:
        tags.append("spirited pace")
    elif avg_kmh < 0.5:
        tags.append("leisurely pace")
    if stop_ratio > 0.4:
        tags.append("frequent stops")

    if duration_minutes > 45 and avg_kmh > 2.0:
        return VibeProjection(
            headline="Post-Park Nap Required (100% Satiated)",
            energy_pct=0,
            couch_pct=100,
            tags=["well earned"],
        )
    if avg_kmh < 0.5 and duration_minutes > 20 and stop_ratio > 0.3:
        return VibeProjection(
            headline="70% Couch Potato, 30% Ready for Zoomies",
            energy_pct=30,
            couch_pct=70,
            tags=tags or ["taking it all in"],
        )
    if avg_kmh > 3.0:
        return VibeProjection(
            headline="80% Energy Machine, 20% Chaos",
            energy_pct=80,
            couch_pct=20,
            tags=tags or ["on a mission"],
        )

    energy = _clamp(int(40 + avg_kmh * 12))
    return VibeProjection(
        headline=f"{energy}% Curious Companion, {100 - energy}% Perfectly Unhurried",
        energy_pct=energy,
        couch_pct=100 - energy,
        tags=tags or ["strolling"],
    )
