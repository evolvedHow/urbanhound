"""Emergency proximity broadcast targeting."""

from uuid import UUID

from pydantic import BaseModel

from app.services.geo import bounding_box, haversine_meters


class CandidateLocation(BaseModel):
    """A registered user's last known position for broadcast targeting.

    Attributes:
        user_id: Identifier of the candidate recipient.
        latitude: Last known latitude.
        longitude: Last known longitude.
    """

    user_id: UUID
    latitude: float
    longitude: float


class BroadcastTarget(BaseModel):
    """A recipient selected to receive an emergency alert.

    Attributes:
        user_id: Identifier of the selected recipient.
        distance_meters: Distance from the incident center.
    """

    user_id: UUID
    distance_meters: float


def select_recipients(
    center_latitude: float,
    center_longitude: float,
    radius_meters: float,
    candidates: list[CandidateLocation],
) -> list[BroadcastTarget]:
    """Select users inside a search radius using a cheap bounding-box prefilter.

    Args:
        center_latitude: Latitude of the incident's last known point.
        center_longitude: Longitude of the incident's last known point.
        radius_meters: Search radius in meters.
        candidates: Users whose last known positions are known.

    Returns:
        Recipients inside the radius, ordered by ascending distance.
    """
    lat_min, lat_max, lng_min, lng_max = bounding_box(
        center_latitude,
        center_longitude,
        radius_meters,
    )
    in_box = [
        candidate
        for candidate in candidates
        if lat_min <= candidate.latitude <= lat_max
        and lng_min <= candidate.longitude <= lng_max
    ]
    targets = [
        BroadcastTarget(
            user_id=candidate.user_id,
            distance_meters=haversine_meters(
                center_latitude,
                center_longitude,
                candidate.latitude,
                candidate.longitude,
            ),
        )
        for candidate in in_box
    ]
    within = [target for target in targets if target.distance_meters <= radius_meters]
    return sorted(within, key=lambda target: target.distance_meters)
