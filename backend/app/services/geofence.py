"""Geofence evaluation with radial and polygonal boundaries."""

from datetime import datetime, timedelta

from pydantic import BaseModel

from app.models import GeofenceStatus, GeofenceZone, GeometryType
from app.services.geo import haversine_meters, point_in_polygon


class ZoneEvaluation(BaseModel):
    """Outcome of checking one fix against a single zone.

    Attributes:
        zone_id: Identifier of the evaluated zone.
        zone_name: Human friendly zone label.
        status: Whether the fix is inside, breaching, or unknown.
        distance_meters: Distance from the fix to the zone center, if radial.
    """

    zone_id: str
    zone_name: str
    status: GeofenceStatus
    distance_meters: float | None = None


class GeofenceEvaluation(BaseModel):
    """Aggregate geofence result for a fix within a session.

    Attributes:
        status: Most severe status across all evaluated zones.
        evaluations: Per-zone detail for the fix.
        breach_started_at: First observed exit time for grace-period tracking.
        grace_deadline: Moment the grace period elapses.
    """

    status: GeofenceStatus
    evaluations: list[ZoneEvaluation]
    breach_started_at: datetime | None = None
    grace_deadline: datetime | None = None


def evaluate_zone(
    zone: GeofenceZone,
    latitude: float,
    longitude: float,
    accuracy_radius_meters: float,
) -> ZoneEvaluation:
    """Evaluate a single fix against one geofence.

    Args:
        zone: The zone to test.
        latitude: Latitude of the current fix.
        longitude: Longitude of the current fix.
        accuracy_radius_meters: Horizontal accuracy of the fix.

    Returns:
        A :class:`ZoneEvaluation` describing whether a breach occurred.
    """
    if not zone.is_enabled:
        return ZoneEvaluation(
            zone_id=str(zone.zone_id),
            zone_name=zone.name,
            status=GeofenceStatus.OK,
        )

    if zone.geometry_type is GeometryType.POLYGON:
        inside = point_in_polygon(latitude, longitude, zone.polygon_coordinates)
        status = GeofenceStatus.OK if inside else GeofenceStatus.BREACH
        return ZoneEvaluation(
            zone_id=str(zone.zone_id),
            zone_name=zone.name,
            status=status,
        )

    distance = haversine_meters(
        latitude,
        longitude,
        zone.center_latitude,
        zone.center_longitude,
    )
    threshold = zone.radius_meters + accuracy_radius_meters
    status = GeofenceStatus.BREACH if distance > threshold else GeofenceStatus.OK
    return ZoneEvaluation(
        zone_id=str(zone.zone_id),
        zone_name=zone.name,
        status=status,
        distance_meters=distance,
    )


def evaluate_zones(
    zones: list[GeofenceZone],
    latitude: float,
    longitude: float,
    accuracy_radius_meters: float,
    now: datetime,
    breach_started_at: datetime | None = None,
) -> GeofenceEvaluation:
    """Evaluate a fix against every zone and apply grace-period debouncing.

    Args:
        zones: Zones to evaluate, typically the subject's enabled zones.
        latitude: Latitude of the current fix.
        longitude: Longitude of the current fix.
        accuracy_radius_meters: Horizontal accuracy of the fix.
        now: Timestamp of the current fix.
        breach_started_at: Time the current breach streak began, if any.

    Returns:
        A :class:`GeofenceEvaluation` with the debounced severity and timing.
    """
    evaluations = [
        evaluate_zone(zone, latitude, longitude, accuracy_radius_meters)
        for zone in zones
    ]
    breaching = [
        evaluation
        for evaluation in evaluations
        if evaluation.status is GeofenceStatus.BREACH
    ]
    if not breaching:
        return GeofenceEvaluation(
            status=GeofenceStatus.OK,
            evaluations=evaluations,
        )

    severity = GeofenceStatus.BREACH
    grace_seconds = _grace_seconds_for(zones, breaching)
    started_at = breach_started_at or now
    deadline = started_at + timedelta(seconds=grace_seconds)
    if now < deadline:
        severity = GeofenceStatus.WARNING

    return GeofenceEvaluation(
        status=severity,
        evaluations=evaluations,
        breach_started_at=started_at,
        grace_deadline=deadline,
    )


def _grace_seconds_for(
    zones: list[GeofenceZone],
    breaching: list[ZoneEvaluation],
) -> int:
    """Return the tightest grace period among the breaching zones.

    Args:
        zones: All evaluated zones.
        breaching: Zone evaluations currently reporting a breach.

    Returns:
        The smallest ``grace_period_seconds`` across breaching zones.
    """
    breaching_ids = {evaluation.zone_id for evaluation in breaching}
    periods = [
        zone.grace_period_seconds
        for zone in zones
        if str(zone.zone_id) in breaching_ids
    ]
    return min(periods) if periods else 30
