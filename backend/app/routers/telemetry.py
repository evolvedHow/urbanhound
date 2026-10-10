"""GPS telemetry ingestion endpoints with accuracy and velocity filtering."""

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, status

from app.config import get_settings
from app.deps import StoreDep, require_session
from app.models import GeofenceStatus, LocationPoint
from app.schemas import (
    TelemetryBatchRequest,
    TelemetryBatchResponse,
    TelemetryIngestRequest,
    TelemetryIngestResponse,
)
from app.services.geo import haversine_meters
from app.services.geofence import evaluate_zones

router = APIRouter(prefix="/telemetry", tags=["telemetry"])


@router.post(
    "/ingest",
    response_model=TelemetryIngestResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def ingest_point(
    payload: TelemetryIngestRequest,
    store: StoreDep,
) -> TelemetryIngestResponse:
    """Ingest a single GPS fix for an active session.

    Fixes are rejected when their horizontal accuracy is worse than the
    configured threshold or when the implied velocity between consecutive fixes
    exceeds the configured maximum.

    Args:
        payload: The submitted GPS fix.
        store: Injected data store.

    Returns:
        An acknowledgement describing acceptance and geofence status.
    """
    return _ingest(store, payload)


@router.post(
    "/ingest-batch",
    response_model=TelemetryBatchResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def ingest_batch(
    payload: TelemetryBatchRequest,
    store: StoreDep,
) -> TelemetryBatchResponse:
    """Ingest a chronological batch of buffered offline fixes.

    Args:
        payload: The batch of fixes to flush.
        store: Injected data store.

    Returns:
        The number of accepted and rejected fixes plus total distance.
    """
    accepted = 0
    rejected = 0
    for fix in sorted(payload.points, key=lambda item: item.recorded_at or _epoch()):
        response = _ingest(store, fix)
        if response.status == "ACCEPTED":
            accepted += 1
        else:
            rejected += 1
    session = store.sessions.get(payload.points[0].session_id)
    distance = session.total_distance_meters if session else 0.0
    return TelemetryBatchResponse(
        accepted=accepted,
        rejected=rejected,
        total_distance_meters=distance,
    )


def _ingest(
    store: StoreDep,
    payload: TelemetryIngestRequest,
) -> TelemetryIngestResponse:
    """Validate and persist a single fix, updating distance and geofences.

    Args:
        store: The data store to mutate.
        payload: The submitted GPS fix.

    Returns:
        The acknowledgement for the fix.
    """
    settings = get_settings()
    session = require_session(store, payload.session_id)
    recorded_at = payload.recorded_at or _now()

    if payload.accuracy_radius_meters > settings.max_accuracy_radius_meters:
        return TelemetryIngestResponse(
            status="REJECTED",
            reason="accuracy radius exceeds threshold",
        )

    previous = _last_point(store, session.session_id)
    if previous is not None:
        elapsed = (recorded_at - previous.recorded_at).total_seconds()
        step = haversine_meters(
            previous.latitude,
            previous.longitude,
            payload.latitude,
            payload.longitude,
        )
        if elapsed >= 1.0 and step / elapsed > settings.max_velocity_mps:
            return TelemetryIngestResponse(
                status="REJECTED",
                reason="implied velocity exceeds threshold",
            )
        if step > 2 * payload.accuracy_radius_meters:
            session.total_distance_meters += step

    point = LocationPoint(
        session_id=session.session_id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        accuracy_radius_meters=payload.accuracy_radius_meters,
        speed_mps=payload.speed_mps,
        heading_degrees=payload.heading_degrees,
        battery_level_pct=payload.battery_level_pct,
        recorded_at=recorded_at,
    )
    store.add_point(point)
    session.last_ping_at = recorded_at

    zones = store.zones_for_subject(session.subject_id)
    breach_started = store.session_breach_state.get(session.session_id)
    evaluation = evaluate_zones(
        zones,
        payload.latitude,
        payload.longitude,
        payload.accuracy_radius_meters,
        recorded_at,
        breach_started,
    )
    if evaluation.breach_started_at is not None:
        store.session_breach_state[session.session_id] = evaluation.breach_started_at
    else:
        store.session_breach_state.pop(session.session_id, None)

    return TelemetryIngestResponse(
        status="ACCEPTED",
        point_id=point.point_id,
        geofence_status=evaluation.status,
        reason=evaluation.evaluations[0].zone_name
        if evaluation.status is not GeofenceStatus.OK and evaluation.evaluations
        else None,
    )


def _last_point(store: StoreDep, session_id: UUID) -> LocationPoint | None:
    """Return the most recent accepted fix for a session.

    Args:
        store: The data store to query.
        session_id: Identifier of the session.

    Returns:
        The latest location point, or ``None`` when the session has no fixes.
    """
    points = store.points_for_session(session_id)
    return points[-1] if points else None


def _now() -> datetime:
    """Return the current UTC time.

    Returns:
        A timezone-aware UTC timestamp.
    """
    return datetime.now(UTC)


def _epoch() -> datetime:
    """Return a sortable minimum timestamp for undated fixes.

    Returns:
        The Unix epoch as a timezone-aware UTC timestamp.
    """
    return datetime(1970, 1, 1, tzinfo=UTC)
