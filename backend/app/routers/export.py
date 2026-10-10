"""Shareable analog artifact export endpoints."""

from fastapi import APIRouter, status

from app.deps import StoreDep, require_session
from app.schemas import ArtifactType, ExportArtifactRequest, ExportArtifactResponse

router = APIRouter(prefix="/export", tags=["export"])

CDN_BASE = "https://cdn.urbanhound.local/exports"


@router.post(
    "/artifact",
    response_model=ExportArtifactResponse,
    status_code=status.HTTP_200_OK,
)
def export_artifact(
    payload: ExportArtifactRequest,
    store: StoreDep,
) -> ExportArtifactResponse:
    """Compile a stop-motion GIF or travel postcard for a session.

    Args:
        payload: The session, artifact type, and selected photos.
        store: Injected data store.

    Returns:
        The rendered artifact URL plus native SMS and share deep links.
    """
    session = require_session(store, payload.session_id)
    suffix = "gif" if payload.artifact_type is ArtifactType.STOP_MOTION_GIF else "jpg"
    artifact_url = f"{CDN_BASE}/{suffix}_8mm_{session.session_id}.{suffix}"
    body = f"Checking in from today's walk. {artifact_url}"
    sms_payload = f"sms:?body={body.replace(' ', '%20')}"
    share_payload = f"https://share.urbanhound.app/artifact/{session.session_id}"
    return ExportArtifactResponse(
        artifact_url=artifact_url,
        native_sms_payload=sms_payload,
        native_share_payload=share_payload,
    )
