"""Retro photo artifact upload and retrieval endpoints."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.deps import StoreDep, require_session
from app.models import PhotoArtifact, utcnow
from app.schemas import PhotoUploadRequest, PhotoUploadResponse

router = APIRouter(prefix="/photos", tags=["photos"])

CDN_BASE = "https://cdn.urbanhound.local/photos"


@router.post(
    "/upload",
    response_model=PhotoUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
def upload_photo(
    payload: PhotoUploadRequest,
    store: StoreDep,
) -> PhotoUploadResponse:
    """Store a retro-processed photo artifact for a session.

    The heavy 1960s color grading, grain, and light-leak compositing happen on
    the device; the API records the resulting artifact, its pinned location,
    the applied prop overlays, and the optional label-maker caption.

    Args:
        payload: The uploaded photo artifact and its metadata.
        store: Injected data store.

    Returns:
        The stored photo identifier and its rendered URL.
    """
    require_session(store, payload.session_id)
    photo = PhotoArtifact(
        session_id=payload.session_id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        original_image_url=f"{CDN_BASE}/orig_{payload.session_id}.jpg",
        retro_image_url=f"{CDN_BASE}/retro_{payload.session_id}.jpg",
        applied_props=payload.applied_props,
        caption_text=payload.caption_text,
        captured_at=payload.captured_at or utcnow(),
    )
    store.add_photo(photo)
    return PhotoUploadResponse(
        photo_id=photo.photo_id,
        retro_image_url=photo.retro_image_url,
        status="PROCESSED",
    )


@router.get("", response_model=list[PhotoArtifact])
def list_photos(
    store: StoreDep,
    session_id: Annotated[
        UUID | None,
        Query(description="Filter by session."),
    ] = None,
) -> list[PhotoArtifact]:
    """List photo artifacts, optionally filtered by session.

    Args:
        store: Injected data store.
        session_id: Optional session identifier filter.

    Returns:
        Matching photos ordered by capture time.
    """
    if session_id is not None:
        return store.photos_for_session(session_id)
    return sorted(store.photos.values(), key=lambda photo: photo.captured_at)


@router.get("/{photo_id}", response_model=PhotoArtifact)
def get_photo(photo_id: UUID, store: StoreDep) -> PhotoArtifact:
    """Fetch a single photo artifact.

    Args:
        photo_id: Identifier of the requested photo.
        store: Injected data store.

    Returns:
        The matching photo artifact.

    Raises:
        HTTPException: If no photo matches the identifier.
    """
    photo = store.photos.get(photo_id)
    if photo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="photo not found",
        )
    return photo
