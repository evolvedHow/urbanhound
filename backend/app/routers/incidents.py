"""Emergency incident broadcast and community sighting endpoints."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.deps import StoreDep, require_subject
from app.models import (
    IncidentReport,
    IncidentStatus,
    SightingReport,
    SubjectStatus,
    utcnow,
)
from app.schemas import (
    IncidentCreate,
    IncidentRead,
    SightingCreate,
    SightingRead,
)
from app.services.broadcast import CandidateLocation, select_recipients

router = APIRouter(prefix="/incidents", tags=["incidents"])


@router.post("", response_model=IncidentRead, status_code=status.HTTP_201_CREATED)
def create_incident(payload: IncidentCreate, store: StoreDep) -> IncidentRead:
    """Broadcast an emergency incident to nearby registered users.

    Args:
        payload: Validated incident details and search radius.
        store: Injected data store.

    Returns:
        The persisted incident including how many users were notified.
    """
    subject = require_subject(store, payload.subject_id)
    incident = IncidentReport(
        subject_id=payload.subject_id,
        reporter_id=payload.reporter_id,
        last_known_latitude=payload.last_known_latitude,
        last_known_longitude=payload.last_known_longitude,
        search_radius_meters=payload.search_radius_meters,
        description=payload.description,
    )
    store.add_incident(incident)
    subject.status = SubjectStatus.MISSING

    targets = select_recipients(
        incident.last_known_latitude,
        incident.last_known_longitude,
        incident.search_radius_meters,
        _candidate_locations(store),
    )
    return _to_read(incident, notified_count=len(targets))


@router.get("", response_model=list[IncidentRead])
def list_incidents(store: StoreDep) -> list[IncidentRead]:
    """List all incident reports.

    Args:
        store: Injected data store.

    Returns:
        Incidents ordered by trigger time.
    """
    return [
        _to_read(incident, notified_count=0)
        for incident in sorted(
            store.incidents.values(),
            key=lambda item: item.triggered_at,
        )
    ]


@router.get("/{incident_id}", response_model=IncidentRead)
def get_incident(incident_id: UUID, store: StoreDep) -> IncidentRead:
    """Fetch a single incident report.

    Args:
        incident_id: Identifier of the requested incident.
        store: Injected data store.

    Returns:
        The matching incident.
    """
    incident = _require_incident(store, incident_id)
    return _to_read(incident, notified_count=0)


@router.post("/{incident_id}/resolve", response_model=IncidentRead)
def resolve_incident(incident_id: UUID, store: StoreDep) -> IncidentRead:
    """Mark an incident as resolved and restore the subject to active.

    Args:
        incident_id: Identifier of the incident to resolve.
        store: Injected data store.

    Returns:
        The updated incident.
    """
    incident = _require_incident(store, incident_id)
    incident.status = IncidentStatus.RESOLVED
    incident.resolved_at = utcnow()
    subject = store.subjects.get(incident.subject_id)
    if subject is not None:
        subject.status = SubjectStatus.ACTIVE
    return _to_read(incident, notified_count=0)


@router.post(
    "/{incident_id}/sightings",
    response_model=SightingRead,
    status_code=status.HTTP_201_CREATED,
)
def create_sighting(
    incident_id: UUID,
    payload: SightingCreate,
    store: StoreDep,
) -> SightingReport:
    """Record a community sighting against an incident.

    Args:
        incident_id: Identifier of the incident being reported on.
        payload: Validated sighting details.
        store: Injected data store.

    Returns:
        The persisted sighting.
    """
    _require_incident(store, incident_id)
    sighting = SightingReport(
        incident_id=incident_id,
        submitter_id=payload.submitter_id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        retro_image_url=payload.retro_image_url,
        notes=payload.notes,
    )
    return store.add_sighting(sighting)


@router.get("/{incident_id}/sightings", response_model=list[SightingRead])
def list_sightings(incident_id: UUID, store: StoreDep) -> list[SightingReport]:
    """List sightings submitted for an incident.

    Args:
        incident_id: Identifier of the incident.
        store: Injected data store.

    Returns:
        Sightings ordered by sighting time.
    """
    _require_incident(store, incident_id)
    return store.sightings_for_incident(incident_id)


def _require_incident(store: StoreDep, incident_id: UUID) -> IncidentReport:
    """Fetch an incident or raise a 404.

    Args:
        store: The data store to query.
        incident_id: Identifier of the requested incident.

    Returns:
        The matching incident.

    Raises:
        HTTPException: If no incident matches the identifier.
    """
    incident = store.incidents.get(incident_id)
    if incident is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="incident not found",
        )
    return incident


def _candidate_locations(store: StoreDep) -> list[CandidateLocation]:
    """Derive each user's last known position from their latest session.

    Args:
        store: The data store to inspect.

    Returns:
        One candidate location per user with usable telemetry.
    """
    candidates: list[CandidateLocation] = []
    for user in store.users.values():
        sessions = sorted(
            (
                session
                for session in store.sessions.values()
                if session.agent_id == user.user_id
            ),
            key=lambda item: item.scheduled_start_time,
            reverse=True,
        )
        for session in sessions:
            points = store.points_for_session(session.session_id)
            if points:
                latest = points[-1]
                candidates.append(
                    CandidateLocation(
                        user_id=user.user_id,
                        latitude=latest.latitude,
                        longitude=latest.longitude,
                    )
                )
                break
    return candidates


def _to_read(incident: IncidentReport, notified_count: int) -> IncidentRead:
    """Map a stored incident to its public representation.

    Args:
        incident: The stored incident.
        notified_count: Number of recipients selected for the broadcast.

    Returns:
        The incident's public representation.
    """
    return IncidentRead(
        incident_id=incident.incident_id,
        subject_id=incident.subject_id,
        reporter_id=incident.reporter_id,
        last_known_latitude=incident.last_known_latitude,
        last_known_longitude=incident.last_known_longitude,
        search_radius_meters=incident.search_radius_meters,
        description=incident.description,
        status=incident.status,
        triggered_at=incident.triggered_at,
        notified_count=notified_count,
    )
