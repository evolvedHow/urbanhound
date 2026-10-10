"""User registration and lookup endpoints."""

from uuid import UUID

from fastapi import APIRouter, status

from app.deps import StoreDep, require_user
from app.models import User
from app.schemas import UserCreate, UserRead

router = APIRouter(prefix="/users", tags=["users"])


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, store: StoreDep) -> User:
    """Register a new user.

    Args:
        payload: Validated registration details.
        store: Injected data store.

    Returns:
        The newly persisted user.
    """
    user = User(
        email=payload.email,
        phone_number=payload.phone_number,
        display_name=payload.display_name,
        role=payload.role,
        default_broadcast_radius_meters=payload.default_broadcast_radius_meters,
    )
    return store.add_user(user)


@router.get("", response_model=list[UserRead])
def list_users(store: StoreDep) -> list[User]:
    """List every registered user.

    Args:
        store: Injected data store.

    Returns:
        All users ordered by creation time.
    """
    return sorted(store.users.values(), key=lambda user: user.created_at)


@router.get("/{user_id}", response_model=UserRead)
def get_user(user_id: UUID, store: StoreDep) -> User:
    """Fetch a single user by identifier.

    Args:
        user_id: Identifier of the requested user.
        store: Injected data store.

    Returns:
        The matching user.
    """
    return require_user(store, user_id)
