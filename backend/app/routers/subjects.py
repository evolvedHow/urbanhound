"""Walk subject (dog) profile endpoints."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, status

from app.deps import StoreDep, require_subject, require_user
from app.models import Subject, SubjectStatus
from app.schemas import SubjectCreate, SubjectRead, SubjectUpdate

router = APIRouter(prefix="/subjects", tags=["subjects"])


@router.post("", response_model=SubjectRead, status_code=status.HTTP_201_CREATED)
def create_subject(payload: SubjectCreate, store: StoreDep) -> Subject:
    """Register a new walk subject owned by a user.

    Args:
        payload: Validated subject details.
        store: Injected data store.

    Returns:
        The newly persisted subject.
    """
    require_user(store, payload.owner_id)
    subject = Subject(
        owner_id=payload.owner_id,
        name=payload.name,
        breed_or_mix=payload.breed_or_mix,
        identifying_marks=payload.identifying_marks,
        favorite_treats_notes=payload.favorite_treats_notes,
    )
    return store.add_subject(subject)


@router.get("", response_model=list[SubjectRead])
def list_subjects(
    store: StoreDep,
    owner_id: Annotated[
        UUID | None,
        Query(description="Filter by owner."),
    ] = None,
) -> list[Subject]:
    """List subjects, optionally filtered by owner.

    Args:
        store: Injected data store.
        owner_id: Optional owner identifier filter.

    Returns:
        Matching subjects ordered by creation time.
    """
    subjects = store.subjects.values()
    if owner_id is not None:
        subjects = [subject for subject in subjects if subject.owner_id == owner_id]
    return sorted(subjects, key=lambda subject: subject.created_at)


@router.get("/{subject_id}", response_model=SubjectRead)
def get_subject(subject_id: UUID, store: StoreDep) -> Subject:
    """Fetch a single subject by identifier.

    Args:
        subject_id: Identifier of the requested subject.
        store: Injected data store.

    Returns:
        The matching subject.
    """
    return require_subject(store, subject_id)


@router.patch("/{subject_id}", response_model=SubjectRead)
def update_subject(
    subject_id: UUID,
    payload: SubjectUpdate,
    store: StoreDep,
) -> Subject:
    """Amend a subject's profile fields.

    Args:
        subject_id: Identifier of the subject to amend.
        payload: Fields to update; omitted fields are left unchanged.
        store: Injected data store.

    Returns:
        The updated subject.
    """
    subject = require_subject(store, subject_id)
    updates = payload.model_dump(exclude_unset=True)
    for field_name, value in updates.items():
        setattr(subject, field_name, value)
    return subject


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
def archive_subject(subject_id: UUID, store: StoreDep) -> None:
    """Archive a subject without deleting its history.

    Args:
        subject_id: Identifier of the subject to archive.
        store: Injected data store.
    """
    subject = require_subject(store, subject_id)
    subject.status = SubjectStatus.ARCHIVED
