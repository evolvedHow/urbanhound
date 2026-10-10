"""Tests for geofence evaluation and grace-period debouncing."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

from app.models import GeofenceStatus, GeofenceZone, GeometryType, ZoneType
from app.services.geofence import evaluate_zone, evaluate_zones


def _radial_zone(radius: float = 100.0, grace: int = 30) -> GeofenceZone:
    return GeofenceZone(
        owner_id=uuid4(),
        name="Home Block",
        zone_type=ZoneType.SAFE_ZONE,
        geometry_type=GeometryType.RADIAL,
        center_latitude=40.0,
        center_longitude=-73.0,
        radius_meters=radius,
        grace_period_seconds=grace,
    )


def test_radial_inside_is_ok() -> None:
    zone = _radial_zone()
    result = evaluate_zone(zone, 40.0, -73.0, 5.0)
    assert result.status is GeofenceStatus.OK


def test_radial_outside_is_breach() -> None:
    zone = _radial_zone(radius=100.0)
    result = evaluate_zone(zone, 40.01, -73.0, 5.0)
    assert result.status is GeofenceStatus.BREACH
    assert result.distance_meters is not None


def test_polygon_zone_breach_when_outside() -> None:
    zone = GeofenceZone(
        owner_id=uuid4(),
        name="Park",
        zone_type=ZoneType.RESTRICTED_ZONE,
        geometry_type=GeometryType.POLYGON,
        center_latitude=0.0,
        center_longitude=0.0,
        polygon_coordinates=[(0.0, 0.0), (0.0, 2.0), (2.0, 2.0), (2.0, 0.0)],
    )
    assert evaluate_zone(zone, 1.0, 1.0, 5.0).status is GeofenceStatus.OK
    assert evaluate_zone(zone, 5.0, 5.0, 5.0).status is GeofenceStatus.BREACH


def test_grace_period_downgrades_breach_to_warning() -> None:
    zone = _radial_zone(radius=100.0, grace=60)
    now = datetime(2026, 10, 9, 12, 0, 0, tzinfo=UTC)
    first = evaluate_zones([zone], 40.01, -73.0, 5.0, now)
    assert first.status is GeofenceStatus.WARNING
    assert first.breach_started_at == now

    later = now + timedelta(seconds=61)
    second = evaluate_zones([zone], 40.01, -73.0, 5.0, later, first.breach_started_at)
    assert second.status is GeofenceStatus.BREACH


def test_returning_inside_clears_breach() -> None:
    zone = _radial_zone(radius=100.0, grace=60)
    now = datetime(2026, 10, 9, 12, 0, 0, tzinfo=UTC)
    result = evaluate_zones([zone], 40.0, -73.0, 5.0, now)
    assert result.status is GeofenceStatus.OK
    assert result.breach_started_at is None
