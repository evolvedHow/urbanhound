"""In-memory repository backing the Urban Hound API.

The store is intentionally dependency-free so the service can run locally, in a
container, or on a serverless host without a database. Every mutation is guarded
by a re-entrant lock, and hydration helpers allow a persistence layer to be
swapped in later without changing the routers.
"""

from datetime import UTC, datetime
from threading import RLock
from uuid import UUID

from app.models import (
    GeofenceZone,
    GeometryType,
    IncidentReport,
    LocationPoint,
    PhotoArtifact,
    SessionStatus,
    SightingReport,
    Subject,
    TaskSession,
    User,
    UserRole,
    ZoneType,
)


class Store:
    """Thread-safe in-memory collections for all domain entities."""

    def __init__(self) -> None:
        """Initialise empty collections and the mutation lock."""
        self._lock = RLock()
        self.users: dict[UUID, User] = {}
        self.subjects: dict[UUID, Subject] = {}
        self.zones: dict[UUID, GeofenceZone] = {}
        self.sessions: dict[UUID, TaskSession] = {}
        self.points: dict[UUID, LocationPoint] = {}
        self.photos: dict[UUID, PhotoArtifact] = {}
        self.incidents: dict[UUID, IncidentReport] = {}
        self.sightings: dict[UUID, SightingReport] = {}
        self.session_breach_state: dict[UUID, datetime] = {}

    @property
    def lock(self) -> RLock:
        """Expose the mutation lock for compound read-modify-write sections.

        Returns:
            The store's re-entrant lock.
        """
        return self._lock

    def add_user(self, user: User) -> User:
        """Persist a new user.

        Args:
            user: The user to store.

        Returns:
            The stored user.
        """
        with self._lock:
            self.users[user.user_id] = user
            return user

    def add_subject(self, subject: Subject) -> Subject:
        """Persist a new subject.

        Args:
            subject: The subject to store.

        Returns:
            The stored subject.
        """
        with self._lock:
            self.subjects[subject.subject_id] = subject
            return subject

    def add_zone(self, zone: GeofenceZone) -> GeofenceZone:
        """Persist a new geofence zone.

        Args:
            zone: The zone to store.

        Returns:
            The stored zone.
        """
        with self._lock:
            self.zones[zone.zone_id] = zone
            return zone

    def add_session(self, session: TaskSession) -> TaskSession:
        """Persist a new walk session.

        Args:
            session: The session to store.

        Returns:
            The stored session.
        """
        with self._lock:
            self.sessions[session.session_id] = session
            return session

    def add_point(self, point: LocationPoint) -> LocationPoint:
        """Persist an accepted telemetry fix.

        Args:
            point: The location point to store.

        Returns:
            The stored location point.
        """
        with self._lock:
            self.points[point.point_id] = point
            return point

    def add_photo(self, photo: PhotoArtifact) -> PhotoArtifact:
        """Persist a photo artifact.

        Args:
            photo: The photo artifact to store.

        Returns:
            The stored photo artifact.
        """
        with self._lock:
            self.photos[photo.photo_id] = photo
            return photo

    def add_incident(self, incident: IncidentReport) -> IncidentReport:
        """Persist an incident report.

        Args:
            incident: The incident to store.

        Returns:
            The stored incident.
        """
        with self._lock:
            self.incidents[incident.incident_id] = incident
            return incident

    def add_sighting(self, sighting: SightingReport) -> SightingReport:
        """Persist a community sighting report.

        Args:
            sighting: The sighting to store.

        Returns:
            The stored sighting.
        """
        with self._lock:
            self.sightings[sighting.sighting_id] = sighting
            return sighting

    def sightings_for_incident(self, incident_id: UUID) -> list[SightingReport]:
        """Return sightings linked to an incident ordered by time.

        Args:
            incident_id: The incident whose sightings are requested.

        Returns:
            Sighting reports sorted ascending by ``sighted_at``.
        """
        return sorted(
            (
                sighting
                for sighting in self.sightings.values()
                if sighting.incident_id == incident_id
            ),
            key=lambda sighting: sighting.sighted_at,
        )

    def points_for_session(self, session_id: UUID) -> list[LocationPoint]:
        """Return accepted fixes for a session ordered by time.

        Args:
            session_id: The session whose fixes are requested.

        Returns:
            Location points sorted ascending by ``recorded_at``.
        """
        return sorted(
            (point for point in self.points.values() if point.session_id == session_id),
            key=lambda point: point.recorded_at,
        )

    def photos_for_session(self, session_id: UUID) -> list[PhotoArtifact]:
        """Return photo artifacts for a session ordered by time.

        Args:
            session_id: The session whose photos are requested.

        Returns:
            Photo artifacts sorted ascending by ``captured_at``.
        """
        return sorted(
            (photo for photo in self.photos.values() if photo.session_id == session_id),
            key=lambda photo: photo.captured_at,
        )

    def zones_for_subject(self, subject_id: UUID) -> list[GeofenceZone]:
        """Return enabled geofences scoped to a subject or its owner.

        Args:
            subject_id: The subject whose zones are requested.

        Returns:
            Geofence zones that apply to the subject.
        """
        subject = self.subjects.get(subject_id)
        owner_id = subject.owner_id if subject else None
        return [
            zone
            for zone in self.zones.values()
            if zone.is_enabled
            and (zone.subject_id == subject_id or zone.subject_id is None)
            and (owner_id is None or zone.owner_id == owner_id)
        ]


store = Store()


def seed_store() -> Store:
    """Populate the store with a refined, demo-ready dataset.

    Returns:
        The globally shared store instance, now seeded.
    """
    if store.users:
        return store

    owner = store.add_user(
        User(
            email="owner@urbanhound.app",
            phone_number="+14155550142",
            display_name="Ava Rendell",
            role=UserRole.CLIENT,
        )
    )
    agent = store.add_user(
        User(
            email="walker@urbanhound.app",
            phone_number="+14155550188",
            display_name="Marcus Bell",
            role=UserRole.FIELD_AGENT,
        )
    )

    atticus = store.add_subject(
        Subject(
            owner_id=owner.user_id,
            name="Atticus",
            breed_or_mix="Wirehaired Fox Terrier",
            identifying_marks="White blaze, one ear that never quite cooperates.",
            favorite_treats_notes="Will negotiate indefinitely for a liver snap.",
        )
    )
    store.add_subject(
        Subject(
            owner_id=owner.user_id,
            name="Pim",
            breed_or_mix="Whippet mix",
            identifying_marks="Brindle coat, serene expression.",
            favorite_treats_notes="Prefers the quiet dignity of a plain biscuit.",
        )
    )

    store.add_zone(
        GeofenceZone(
            owner_id=owner.user_id,
            subject_id=atticus.subject_id,
            name="Home Block",
            zone_type=ZoneType.SAFE_ZONE,
            geometry_type=GeometryType.RADIAL,
            center_latitude=40.7359,
            center_longitude=-73.9911,
            radius_meters=400.0,
            grace_period_seconds=30,
        )
    )
    store.add_zone(
        GeofenceZone(
            owner_id=owner.user_id,
            subject_id=None,
            name="Riverside Off-Leash",
            zone_type=ZoneType.RESTRICTED_ZONE,
            geometry_type=GeometryType.RADIAL,
            center_latitude=40.7411,
            center_longitude=-73.9897,
            radius_meters=220.0,
            grace_period_seconds=45,
        )
    )

    session = store.add_session(
        TaskSession(
            subject_id=atticus.subject_id,
            agent_id=agent.user_id,
            status=SessionStatus.IN_PROGRESS,
            actual_start_time=datetime.now(UTC),
            last_ping_at=datetime.now(UTC),
            current_vibe_text="80% Energy Machine, 20% Chaos",
            status_caption_text=(
                "Currently auditing a suspicious squirrel on Oak Street."
            ),
        )
    )
    now = datetime.now(UTC)
    for index in range(6):
        store.add_point(
            LocationPoint(
                session_id=session.session_id,
                latitude=40.7359 + index * 0.0006,
                longitude=-73.9911 + index * 0.0004,
                accuracy_radius_meters=4.0,
                speed_mps=1.2,
                heading_degrees=45.0,
                battery_level_pct=90 - index,
                recorded_at=now,
            )
        )
    store.add_photo(
        PhotoArtifact(
            session_id=session.session_id,
            latitude=40.7371,
            longitude=-73.9899,
            original_image_url="https://cdn.urbanhound.local/photos/orig_seed.jpg",
            retro_image_url="https://cdn.urbanhound.local/photos/retro_seed.jpg",
            caption_text="Found a 10/10 stick near Oak Street",
            captured_at=now,
        )
    )
    return store
