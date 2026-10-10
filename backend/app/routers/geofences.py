"""Geofence zone definition endpoints."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.deps import StoreDep, require_user
from app.models import GeofenceZone
from app.schemas import GeofenceCreate

router = APIRouter(prefix="/geofences", tags=["geofences"])


@router.post("", response_model=GeofenceZone, status_code=status.HTTP_201_CREATED)
def create_zone(payload: GeofenceCreate, store: StoreDep) -> GeofenceZone:
    """Define a new geofence zone for a subject or owner.

    Args:
        payload: Validated zone geometry and policy.
        store: Injected data store.

    Returns:
        The newly persisted zone.
    """
    require_user(store, payload.owner_id)
    zone = GeofenceZone(**payload.model_dump())
    return store.add_zone(zone)


@router.get("", response_model=list[GeofenceZone])
def list_zones(
    store: StoreDep,
    subject_id: Annotated[
        UUID | None,
        Query(description="Filter by subject."),
    ] = None,
) -> list[GeofenceZone]:
    """List geofence zones, optionally filtered by subject.

    Args:
        store: Injected data store.
        subject_id: Optional subject identifier filter.

    Returns:
        Matching zones ordered by name.
    """
    zones = store.zones.values()
    if subject_id is not None:
        zones = [zone for zone in zones if zone.subject_id == subject_id]
    return sorted(zones, key=lambda zone: zone.name)


@router.get("/{zone_id}", response_model=GeofenceZone)
def get_zone(zone_id: UUID, store: StoreDep) -> GeofenceZone:
    """Fetch a single geofence zone.

    Args:
        zone_id: Identifier of the requested zone.
        store: Injected data store.

    Returns:
        The matching zone.

    Raises:
        HTTPException: If no zone matches the identifier.
    """
    zone = store.zones.get(zone_id)
    if zone is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="zone not found",
        )
    return zone


@router.delete("/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_zone(zone_id: UUID, store: StoreDep) -> None:
    """Delete a geofence zone.

    Args:
        zone_id: Identifier of the zone to remove.
        store: Injected data store.
    """
    with store.lock:
        store.zones.pop(zone_id, None)
