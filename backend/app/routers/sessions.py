"""Walk session lifecycle, telemetry-derived vibe, and scrapbook trail endpoints."""

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.deps import StoreDep, require_session, require_subject
from app.models import PhotoArtifact, SessionStatus, SubjectStatus, TaskSession
from app.schemas import (
    CaptionAction,
    SessionActionRequest,
    SessionActionResponse,
    SessionCreate,
    SessionEvent,
    StatusCaptionRequest,
    StatusCaptionResponse,
    TrailPoint,
    TrailRead,
    VibeRead,
)
from app.services.geo import haversine_meters, path_distance_meters
from app.services.humor import shuffle_status
from app.services.session_fsm import TransitionError, apply_event, now_utc
from app.services.vibe import project_vibe

router = APIRouter(prefix="/sessions", tags=["sessions"])

PHOTO_TRAIL_RADIUS_METERS = 20.0
STOP_SPEED_THRESHOLD_MPS = 0.2


@router.post("", response_model=TaskSession, status_code=status.HTTP_201_CREATED)
def create_session(payload: SessionCreate, store: StoreDep) -> TaskSession:
    """Schedule a new walk session for a subject.

    Args:
        payload: Validated session scheduling details.
        store: Injected data store.

    Returns:
        The newly persisted session.
    """
    require_subject(store, payload.subject_id)
    session = TaskSession(
        subject_id=payload.subject_id,
        agent_id=payload.agent_id,
        scheduled_start_time=payload.scheduled_start_time or now_utc(),
        scheduled_end_time=payload.scheduled_end_time,
    )
    return store.add_session(session)


@router.get("", response_model=list[TaskSession])
def list_sessions(
    store: StoreDep,
    subject_id: Annotated[
        UUID | None,
        Query(description="Filter by subject."),
    ] = None,
    agent_id: Annotated[
        UUID | None,
        Query(description="Filter by agent."),
    ] = None,
    session_status: Annotated[
        SessionStatus | None,
        Query(alias="status", description="Filter by lifecycle state."),
    ] = None,
) -> list[TaskSession]:
    """List walk sessions with optional filters.

    Args:
        store: Injected data store.
        subject_id: Optional subject filter.
        agent_id: Optional agent filter.
        session_status: Optional lifecycle-state filter.

    Returns:
        Matching sessions ordered by scheduled start time.
    """
    sessions = list(store.sessions.values())
    if subject_id is not None:
        sessions = [item for item in sessions if item.subject_id == subject_id]
    if agent_id is not None:
        sessions = [item for item in sessions if item.agent_id == agent_id]
    if session_status is not None:
        sessions = [item for item in sessions if item.status is session_status]
    return sorted(sessions, key=lambda item: item.scheduled_start_time)


@router.post("/status-caption", response_model=StatusCaptionResponse)
def mutate_status_caption(
    payload: StatusCaptionRequest,
    store: StoreDep,
) -> StatusCaptionResponse:
    """Shuffle or override a session's whimsical status caption.

    Args:
        payload: The requested caption action and optional custom text.
        store: Injected data store.

    Returns:
        The resulting caption text.

    Raises:
        HTTPException: If an override is requested without custom text.
    """
    session = require_session(store, payload.session_id)
    if payload.action is CaptionAction.OVERRIDE:
        if not payload.custom_caption:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="custom_caption is required when action is OVERRIDE",
            )
        session.status_caption_text = payload.custom_caption
    else:
        session.status_caption_text = shuffle_status(session.status_caption_text)
    return StatusCaptionResponse(
        status="UPDATED",
        current_caption_text=session.status_caption_text,
    )


@router.get("/{session_id}", response_model=TaskSession)
def get_session(session_id: UUID, store: StoreDep) -> TaskSession:
    """Fetch a single walk session.

    Args:
        session_id: Identifier of the requested session.
        store: Injected data store.

    Returns:
        The matching session.
    """
    return require_session(store, session_id)


@router.post("/{session_id}/actions", response_model=SessionActionResponse)
def apply_session_action(
    session_id: UUID,
    payload: SessionActionRequest,
    store: StoreDep,
) -> SessionActionResponse:
    """Apply an FSM event to a session and run its side effects.

    Args:
        session_id: Identifier of the target session.
        payload: The event to apply plus optional agent and reason.
        store: Injected data store.

    Returns:
        The resulting status label and updated session.

    Raises:
        HTTPException: If the transition is invalid for the current state.
    """
    session = require_session(store, session_id)
    try:
        next_status = apply_event(session.status, payload.event)
    except TransitionError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    now = now_utc()
    subject = store.subjects.get(session.subject_id)

    if payload.event is SessionEvent.ACCEPT_TASK:
        if payload.agent_id is not None:
            session.agent_id = payload.agent_id
        session.actual_start_time = now
        session.last_ping_at = now
        if subject is not None:
            subject.status = SubjectStatus.IN_SESSION
    elif payload.event is SessionEvent.END_SESSION:
        session.actual_end_time = now
        points = store.points_for_session(session.session_id)
        session.total_distance_meters = path_distance_meters(
            [(point.latitude, point.longitude) for point in points]
        )
        duration = _duration_seconds(session, now)
        stop_count = sum(
            1 for point in points if point.speed_mps < STOP_SPEED_THRESHOLD_MPS
        )
        vibe = project_vibe(session.total_distance_meters, duration, stop_count)
        session.current_vibe_text = vibe.headline
        if not session.status_caption_text:
            session.status_caption_text = shuffle_status()
        if subject is not None:
            subject.status = SubjectStatus.ACTIVE
    elif payload.event in {SessionEvent.CANCEL_TASK, SessionEvent.FORCE_CANCEL}:
        session.cancellation_reason = payload.reason
        if subject is not None and subject.status is SubjectStatus.IN_SESSION:
            subject.status = SubjectStatus.ACTIVE

    session.status = next_status
    return SessionActionResponse(status=next_status.value, session=session)


@router.get("/{session_id}/vibe", response_model=VibeRead)
def get_session_vibe(session_id: UUID, store: StoreDep) -> VibeRead:
    """Compute the Daily Vibe Check projection for a session.

    Args:
        session_id: Identifier of the target session.
        store: Injected data store.

    Returns:
        The projected vibe with its raw telemetry inputs.
    """
    session = require_session(store, session_id)
    points = store.points_for_session(session.session_id)
    now = now_utc()
    duration = _duration_seconds(session, now)
    distance = session.total_distance_meters or path_distance_meters(
        [(point.latitude, point.longitude) for point in points]
    )
    stop_count = sum(
        1 for point in points if point.speed_mps < STOP_SPEED_THRESHOLD_MPS
    )
    vibe = project_vibe(distance, duration, stop_count)
    return VibeRead(
        session_id=session.session_id,
        headline=vibe.headline,
        energy_pct=vibe.energy_pct,
        couch_pct=vibe.couch_pct,
        tags=vibe.tags,
        distance_meters=distance,
        duration_minutes=round(duration / 60.0, 1),
    )


@router.get("/{session_id}/trail", response_model=TrailRead)
def get_session_trail(session_id: UUID, store: StoreDep) -> TrailRead:
    """Render a session as a scrapbook trail with pinned photos.

    Args:
        session_id: Identifier of the target session.
        store: Injected data store.

    Returns:
        The ordered trail coordinates, photos, and underlying session.
    """
    session = require_session(store, session_id)
    points = store.points_for_session(session.session_id)
    photos = store.photos_for_session(session.session_id)
    trail_points = [
        TrailPoint(
            latitude=point.latitude,
            longitude=point.longitude,
            recorded_at=point.recorded_at,
            has_photo=_has_nearby_photo(point.latitude, point.longitude, photos),
        )
        for point in points
    ]
    distance = session.total_distance_meters or path_distance_meters(
        [(point.latitude, point.longitude) for point in points]
    )
    return TrailRead(
        session_id=session.session_id,
        distance_meters=distance,
        points=trail_points,
        photos=photos,
        session=session,
    )


def _duration_seconds(session: TaskSession, now: datetime) -> float:
    """Return the elapsed session duration in seconds.

    Args:
        session: The session being measured.
        now: Current timestamp used when the session is still open.

    Returns:
        Elapsed seconds, or ``0.0`` if the session has not started.
    """
    if session.actual_start_time is None:
        return 0.0
    end = session.actual_end_time or now
    return max((end - session.actual_start_time).total_seconds(), 1.0)


def _has_nearby_photo(
    latitude: float,
    longitude: float,
    photos: list[PhotoArtifact],
) -> bool:
    """Return whether any photo is pinned near a trail coordinate.

    Args:
        latitude: Trail latitude.
        longitude: Trail longitude.
        photos: Photo artifacts captured during the session.

    Returns:
        ``True`` when a photo lies within the pin radius.
    """
    return any(
        haversine_meters(latitude, longitude, photo.latitude, photo.longitude)
        <= PHOTO_TRAIL_RADIUS_METERS
        for photo in photos
    )
