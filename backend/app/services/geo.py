"""Geospatial primitives: distances, bounding boxes and point-in-polygon tests."""

import math
from collections.abc import Iterable, Sequence

EARTH_RADIUS_METERS = 6_371_000.0
METERS_PER_DEGREE_LATITUDE = 111_320.0


def haversine_meters(
    lat1: float,
    lng1: float,
    lat2: float,
    lng2: float,
) -> float:
    """Return the great-circle distance between two coordinates.

    Args:
        lat1: Latitude of the first point in decimal degrees.
        lng1: Longitude of the first point in decimal degrees.
        lat2: Latitude of the second point in decimal degrees.
        lng2: Longitude of the second point in decimal degrees.

    Returns:
        Distance along the Earth's surface in meters.
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)
    a = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    )
    return 2 * EARTH_RADIUS_METERS * math.asin(math.sqrt(a))


def path_distance_meters(points: Iterable[tuple[float, float]]) -> float:
    """Accumulate the total path length across an ordered coordinate sequence.

    Args:
        points: Ordered ``(latitude, longitude)`` pairs describing the route.

    Returns:
        Total travelled distance in meters.
    """
    total = 0.0
    previous: tuple[float, float] | None = None
    for current in points:
        if previous is not None:
            total += haversine_meters(previous[0], previous[1], current[0], current[1])
        previous = current
    return total


def bounding_box(
    center_latitude: float,
    center_longitude: float,
    radius_meters: float,
) -> tuple[float, float, float, float]:
    """Compute a lat/lng bounding box enclosing a search radius.

    Args:
        center_latitude: Latitude of the box center in decimal degrees.
        center_longitude: Longitude of the box center in decimal degrees.
        radius_meters: Radius, in meters, to enclose around the center.

    Returns:
        A ``(lat_min, lat_max, lng_min, lng_max)`` tuple.
    """
    lat_delta = radius_meters / METERS_PER_DEGREE_LATITUDE
    cos_lat = max(math.cos(math.radians(center_latitude)), 1e-6)
    lng_delta = radius_meters / (METERS_PER_DEGREE_LATITUDE * cos_lat)
    return (
        center_latitude - lat_delta,
        center_latitude + lat_delta,
        center_longitude - lng_delta,
        center_longitude + lng_delta,
    )


def point_in_polygon(
    latitude: float,
    longitude: float,
    polygon: Sequence[tuple[float, float]],
) -> bool:
    """Test whether a point lies inside a polygon using ray casting.

    Args:
        latitude: Latitude of the query point in decimal degrees.
        longitude: Longitude of the query point in decimal degrees.
        polygon: Ordered ``(latitude, longitude)`` vertices of the polygon.

    Returns:
        ``True`` when the point falls inside the polygon boundary.
    """
    if len(polygon) < 3:
        return False
    inside = False
    count = len(polygon)
    for i in range(count):
        lat_a, lng_a = polygon[i]
        lat_b, lng_b = polygon[(i + 1) % count]
        intersects = (lat_a > latitude) != (lat_b > latitude)
        if intersects:
            slope = (lng_b - lng_a) / (lat_b - lat_a)
            crossing_lng = lng_a + (latitude - lat_a) * slope
            if longitude < crossing_lng:
                inside = not inside
    return inside
