"""Request and response contracts for the versioned HTTP API."""

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import (
    ArtifactType,
    CaptionAction,
    GeofenceStatus,
    GeometryType,
    IncidentStatus,
    PhotoArtifact,
    PropPlacement,
    SightingReport,
    Subject,
    SubjectStatus,
    TaskSession,
    User,
    UserRole,
    VerificationStatus,
    ZoneType,
)


class ContractModel(BaseModel):
    """Base model for API contracts with strict, explicit validation."""

    model_config = ConfigDict(extra="forbid")


class SessionEvent(StrEnum):
    """Events that drive the TaskSession finite state machine."""

    DISPATCH_TASK = "DISPATCH_TASK"
    ACCEPT_TASK = "ACCEPT_TASK"
    PAUSE_SESSION = "PAUSE_SESSION"
    RESUME_SESSION = "RESUME_SESSION"
    END_SESSION = "END_SESSION"
    CANCEL_TASK = "CANCEL_TASK"
    FORCE_CANCEL = "FORCE_CANCEL"
    TELEMETRY_TIMEOUT = "TELEMETRY_TIMEOUT"
    SHUFFLE_STATUS = "SHUFFLE_STATUS"
    CAPTURE_PHOTO = "CAPTURE_PHOTO"


class UserCreate(ContractModel):
    """Payload for registering a user."""

    email: EmailStr
    phone_number: str = Field(pattern=r"^\+[1-9]\d{1,14}$")
    display_name: str = Field(min_length=1, max_length=80)
    role: UserRole = UserRole.CLIENT
    default_broadcast_radius_meters: int = Field(default=5000, gt=0, le=100_000)


class UserRead(User):
    """Public representation of a stored user."""


class SubjectCreate(ContractModel):
    """Payload for registering a walk subject."""

    owner_id: UUID
    name: str = Field(min_length=1, max_length=60)
    breed_or_mix: str = Field(min_length=1, max_length=120)
    identifying_marks: str = ""
    favorite_treats_notes: str = ""


class SubjectUpdate(ContractModel):
    """Payload for amending a subject's profile."""

    name: str | None = Field(default=None, min_length=1, max_length=60)
    breed_or_mix: str | None = Field(default=None, min_length=1, max_length=120)
    status: SubjectStatus | None = None
    identifying_marks: str | None = None
    favorite_treats_notes: str | None = None


class SubjectRead(Subject):
    """Public representation of a stored subject."""


class GeofenceCreate(ContractModel):
    """Payload for defining a geofence zone."""

    owner_id: UUID
    subject_id: UUID | None = None
    name: str = Field(min_length=1, max_length=80)
    zone_type: ZoneType = ZoneType.SAFE_ZONE
    geometry_type: GeometryType = GeometryType.RADIAL
    center_latitude: float = Field(default=0.0, ge=-90.0, le=90.0)
    center_longitude: float = Field(default=0.0, ge=-180.0, le=180.0)
    radius_meters: float = Field(default=250.0, ge=0.0)
    polygon_coordinates: list[tuple[float, float]] = Field(default_factory=list)
    grace_period_seconds: int = Field(default=30, ge=0, le=3600)
    is_enabled: bool = True


class SessionCreate(ContractModel):
    """Payload for scheduling a walk session."""

    subject_id: UUID
    agent_id: UUID | None = None
    scheduled_start_time: datetime | None = None
    scheduled_end_time: datetime | None = None


class SessionActionRequest(ContractModel):
    """Payload describing an FSM event applied to a session."""

    event: SessionEvent
    agent_id: UUID | None = None
    reason: str | None = None


class SessionActionResponse(ContractModel):
    """Result of applying an FSM event to a session."""

    status: str
    session: TaskSession


class TelemetryIngestRequest(ContractModel):
    """A single GPS fix submitted by a field agent."""

    session_id: UUID
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)
    accuracy_radius_meters: float = Field(ge=0.0)
    speed_mps: float = Field(default=0.0, ge=0.0)
    heading_degrees: float = Field(default=0.0, ge=0.0, lt=360.0)
    battery_level_pct: int = Field(default=100, ge=0, le=100)
    recorded_at: datetime | None = None


class TelemetryIngestResponse(ContractModel):
    """Acknowledgement of an accepted telemetry fix."""

    status: str
    point_id: UUID | None = None
    geofence_status: GeofenceStatus = GeofenceStatus.OK
    reason: str | None = None


class TelemetryBatchRequest(ContractModel):
    """A chronological batch of offline fixes flushed on reconnect."""

    points: list[TelemetryIngestRequest] = Field(min_length=1, max_length=2000)


class TelemetryBatchResponse(ContractModel):
    """Summary of a batch ingestion."""

    accepted: int
    rejected: int
    total_distance_meters: float


class PhotoUploadRequest(ContractModel):
    """A processed photo artifact submitted by a field agent."""

    session_id: UUID
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)
    image_base64: str = Field(min_length=16)
    applied_props: list[PropPlacement] = Field(default_factory=list)
    caption_text: str = Field(default="", max_length=240)
    captured_at: datetime | None = None


class PhotoUploadResponse(ContractModel):
    """Result of storing and processing a photo artifact."""

    photo_id: UUID
    retro_image_url: str
    status: str


class StatusCaptionRequest(ContractModel):
    """Request to shuffle or override a session's status caption."""

    session_id: UUID
    action: CaptionAction
    custom_caption: str | None = Field(default=None, max_length=240)


class StatusCaptionResponse(ContractModel):
    """Result of a status caption mutation."""

    status: str
    current_caption_text: str


class ExportArtifactRequest(ContractModel):
    """Request to compile a shareable analog artifact from a session."""

    session_id: UUID
    artifact_type: ArtifactType
    selected_photo_ids: list[UUID] = Field(default_factory=list)


class ExportArtifactResponse(ContractModel):
    """A rendered artifact plus native share deep links."""

    artifact_url: str
    native_sms_payload: str
    native_share_payload: str


class IncidentCreate(ContractModel):
    """Payload for broadcasting an emergency incident."""

    subject_id: UUID
    reporter_id: UUID
    last_known_latitude: float = Field(ge=-90.0, le=90.0)
    last_known_longitude: float = Field(ge=-180.0, le=180.0)
    search_radius_meters: float = Field(default=5000.0, gt=0.0)
    description: str = ""


class IncidentRead(IncidentCreate):
    """Public representation of an incident report."""

    incident_id: UUID
    status: IncidentStatus
    triggered_at: datetime
    notified_count: int = 0


class SightingCreate(ContractModel):
    """Payload for a community sighting report."""

    incident_id: UUID
    submitter_id: UUID | None = None
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)
    retro_image_url: str | None = None
    notes: str = ""


class SightingRead(SightingReport):
    """Public representation of a sighting report."""

    verification_status: VerificationStatus = VerificationStatus.UNVERIFIED


class VibeRead(ContractModel):
    """Projected vibe for a session, including raw telemetry inputs."""

    session_id: UUID
    headline: str
    energy_pct: int
    couch_pct: int
    tags: list[str]
    distance_meters: float
    duration_minutes: float


class TrailPoint(ContractModel):
    """A single coordinate in a rendered scrapbook trail.

    Attributes:
        latitude: Trail latitude.
        longitude: Trail longitude.
        recorded_at: When the fix was captured.
        has_photo: Whether a pinned photo exists at this point.
    """

    latitude: float
    longitude: float
    recorded_at: datetime
    has_photo: bool = False


class TrailRead(ContractModel):
    """A session rendered as a scrapbook trail.

    Attributes:
        session_id: The rendered session.
        distance_meters: Accumulated path distance.
        points: Ordered trail coordinates.
        photos: Pinned photo artifacts.
        session: The underlying session record.
    """

    session_id: UUID
    distance_meters: float
    points: list[TrailPoint]
    photos: list[PhotoArtifact]
    session: TaskSession
