"""Pydantic domain models and API contracts for Urban Hound.

The models mirror the functional specification: identity (``User``), the walk
subject (``Subject``), spatial rules (``GeofenceZone``), the field session
(``TaskSession`` and ``LocationPoint``), retro media (``PhotoArtifact``) and the
emergency workflow (``IncidentReport`` and ``SightingReport``).
"""

from datetime import UTC, datetime
from enum import StrEnum
from typing import Annotated
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, EmailStr, Field

Latitude = Annotated[float, Field(ge=-90.0, le=90.0)]
Longitude = Annotated[float, Field(ge=-180.0, le=180.0)]
Percentage = Annotated[int, Field(ge=0, le=100)]


def utcnow() -> datetime:
    """Return the current time as a timezone-aware UTC timestamp.

    Returns:
        A :class:`datetime` in UTC.
    """
    return datetime.now(UTC)


class UserRole(StrEnum):
    """Role granted to an authenticated principal."""

    GUEST = "GUEST"
    CLIENT = "CLIENT"
    FIELD_AGENT = "FIELD_AGENT"
    ADMIN = "ADMIN"


class SubjectStatus(StrEnum):
    """Lifecycle state of a walk subject (a dog)."""

    ACTIVE = "ACTIVE"
    IN_SESSION = "IN_SESSION"
    MISSING = "MISSING"
    ARCHIVED = "ARCHIVED"


class ZoneType(StrEnum):
    """Semantic classification of a geofence zone."""

    SAFE_ZONE = "SAFE_ZONE"
    WARNING_ZONE = "WARNING_ZONE"
    RESTRICTED_ZONE = "RESTRICTED_ZONE"


class GeometryType(StrEnum):
    """Supported geofence geometry primitives."""

    RADIAL = "RADIAL"
    POLYGON = "POLYGON"


class SessionStatus(StrEnum):
    """State of a field walk session in the task FSM."""

    SCHEDULED = "SCHEDULED"
    DISPATCHED = "DISPATCHED"
    IN_PROGRESS = "IN_PROGRESS"
    PAUSED = "PAUSED"
    STALLED = "STALLED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class IncidentStatus(StrEnum):
    """Resolution state of an emergency incident report."""

    OPEN = "OPEN"
    RESOLVED = "RESOLVED"
    CANCELLED = "CANCELLED"


class VerificationStatus(StrEnum):
    """Trust level assigned to a community sighting."""

    UNVERIFIED = "UNVERIFIED"
    VERIFIED_POSITIVE = "VERIFIED_POSITIVE"
    REJECTED = "REJECTED"


class ArtifactType(StrEnum):
    """Shareable analog artifact rendered from a session."""

    POSTCARD_MMS = "POSTCARD_MMS"
    STOP_MOTION_GIF = "STOP_MOTION_GIF"


class GeofenceStatus(StrEnum):
    """Result of evaluating a fix against the subject's zones."""

    OK = "OK"
    WARNING = "WARNING"
    BREACH = "BREACH"


class CaptionAction(StrEnum):
    """Action applied to a session status caption."""

    SHUFFLE = "SHUFFLE"
    OVERRIDE = "OVERRIDE"


class DomainModel(BaseModel):
    """Base model enabling population by field name for store hydration."""

    model_config = ConfigDict(populate_by_name=True)


class User(DomainModel):
    """An account-scoped identity within the platform."""

    user_id: UUID = Field(default_factory=uuid4)
    email: EmailStr
    phone_number: str = Field(pattern=r"^\+[1-9]\d{1,14}$")
    display_name: str = Field(min_length=1, max_length=80)
    role: UserRole = UserRole.CLIENT
    push_token: str | None = None
    default_broadcast_radius_meters: int = Field(default=5000, gt=0, le=100_000)
    is_active: bool = True
    created_at: datetime = Field(default_factory=utcnow)


class Subject(DomainModel):
    """A dog whose walks, photos and alerts are tracked."""

    subject_id: UUID = Field(default_factory=uuid4)
    owner_id: UUID
    name: str = Field(min_length=1, max_length=60)
    breed_or_mix: str = Field(min_length=1, max_length=120)
    status: SubjectStatus = SubjectStatus.ACTIVE
    profile_image_url: str | None = None
    identifying_marks: str = ""
    favorite_treats_notes: str = ""
    created_at: datetime = Field(default_factory=utcnow)


class GeofenceZone(DomainModel):
    """A radial or polygonal boundary with an exit grace period."""

    zone_id: UUID = Field(default_factory=uuid4)
    owner_id: UUID
    subject_id: UUID | None = None
    name: str = Field(min_length=1, max_length=80)
    zone_type: ZoneType = ZoneType.SAFE_ZONE
    geometry_type: GeometryType = GeometryType.RADIAL
    center_latitude: Latitude
    center_longitude: Longitude
    radius_meters: float = Field(default=250.0, ge=0.0)
    polygon_coordinates: list[tuple[float, float]] = Field(default_factory=list)
    grace_period_seconds: int = Field(default=30, ge=0, le=3600)
    is_enabled: bool = True


class LocationPoint(DomainModel):
    """A single accepted GPS fix within a field session."""

    point_id: UUID = Field(default_factory=uuid4)
    session_id: UUID
    latitude: Latitude
    longitude: Longitude
    accuracy_radius_meters: float = Field(ge=0.0)
    speed_mps: float = Field(default=0.0, ge=0.0)
    heading_degrees: float = Field(default=0.0, ge=0.0, lt=360.0)
    battery_level_pct: Percentage
    recorded_at: datetime = Field(default_factory=utcnow)


class TaskSession(DomainModel):
    """A scheduled or active walk performed for a subject."""

    session_id: UUID = Field(default_factory=uuid4)
    subject_id: UUID
    agent_id: UUID | None = None
    status: SessionStatus = SessionStatus.SCHEDULED
    scheduled_start_time: datetime = Field(default_factory=utcnow)
    scheduled_end_time: datetime | None = None
    actual_start_time: datetime | None = None
    actual_end_time: datetime | None = None
    total_distance_meters: float = Field(default=0.0, ge=0.0)
    current_vibe_text: str = ""
    status_caption_text: str = ""
    cancellation_reason: str | None = None
    last_ping_at: datetime | None = None


class PropPlacement(DomainModel):
    """Placement of a decorative prop over a captured photo."""

    prop_id: str = Field(min_length=1, max_length=64)
    offset_x_pct: float = Field(ge=0.0, le=100.0)
    offset_y_pct: float = Field(ge=0.0, le=100.0)
    scale: float = Field(default=1.0, gt=0.0, le=10.0)
    rotation_deg: float = Field(default=0.0, ge=-360.0, le=360.0)


class PhotoArtifact(DomainModel):
    """A retro-processed photo pinned to a session location."""

    photo_id: UUID = Field(default_factory=uuid4)
    session_id: UUID
    latitude: Latitude
    longitude: Longitude
    original_image_url: str
    retro_image_url: str
    applied_props: list[PropPlacement] = Field(default_factory=list)
    caption_text: str = ""
    captured_at: datetime = Field(default_factory=utcnow)


class IncidentReport(DomainModel):
    """An emergency broadcast for a missing subject."""

    incident_id: UUID = Field(default_factory=uuid4)
    subject_id: UUID
    reporter_id: UUID
    status: IncidentStatus = IncidentStatus.OPEN
    last_known_latitude: Latitude
    last_known_longitude: Longitude
    search_radius_meters: float = Field(default=5000.0, gt=0.0)
    description: str = ""
    triggered_at: datetime = Field(default_factory=utcnow)
    resolved_at: datetime | None = None


class SightingReport(DomainModel):
    """A community-submitted sighting linked to an incident."""

    sighting_id: UUID = Field(default_factory=uuid4)
    incident_id: UUID
    submitter_id: UUID | None = None
    latitude: Latitude
    longitude: Longitude
    retro_image_url: str | None = None
    notes: str = ""
    verification_status: VerificationStatus = VerificationStatus.UNVERIFIED
    sighted_at: datetime = Field(default_factory=utcnow)
