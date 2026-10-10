"""Shared FastAPI dependencies for the Urban Hound API."""

from typing import Annotated

from fastapi import Depends, HTTPException, status

from app.models import Subject, TaskSession, User
from app.store import Store, store


def get_store() -> Store:
    """Return the process-wide store as a dependency.

    Returns:
        The shared in-memory :class:`Store`.
    """
    return store


StoreDep = Annotated[Store, Depends(get_store)]


def require_user(store_instance: Store, user_id: object) -> User:
    """Fetch a user or raise a 404.

    Args:
        store_instance: The data store to query.
        user_id: Identifier of the requested user.

    Returns:
        The matching user.

    Raises:
        HTTPException: If no user matches the identifier.
    """
    user = store_instance.users.get(user_id)  # type: ignore[arg-type]
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="user not found",
        )
    return user


def require_subject(store_instance: Store, subject_id: object) -> Subject:
    """Fetch a subject or raise a 404.

    Args:
        store_instance: The data store to query.
        subject_id: Identifier of the requested subject.

    Returns:
        The matching subject.

    Raises:
        HTTPException: If no subject matches the identifier.
    """
    subject = store_instance.subjects.get(subject_id)  # type: ignore[arg-type]
    if subject is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="subject not found",
        )
    return subject


def require_session(store_instance: Store, session_id: object) -> TaskSession:
    """Fetch a session or raise a 404.

    Args:
        store_instance: The data store to query.
        session_id: Identifier of the requested session.

    Returns:
        The matching session.

    Raises:
        HTTPException: If no session matches the identifier.
    """
    session = store_instance.sessions.get(session_id)  # type: ignore[arg-type]
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="session not found",
        )
    return session
