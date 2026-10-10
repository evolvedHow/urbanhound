"""TaskSession finite state machine, mirroring the specification."""

from datetime import UTC, datetime

from app.models import SessionStatus
from app.schemas import SessionEvent

TRANSITIONS: dict[tuple[SessionStatus, SessionEvent], SessionStatus] = {
    (SessionStatus.SCHEDULED, SessionEvent.DISPATCH_TASK): SessionStatus.DISPATCHED,
    (SessionStatus.DISPATCHED, SessionEvent.ACCEPT_TASK): SessionStatus.IN_PROGRESS,
    (SessionStatus.IN_PROGRESS, SessionEvent.PAUSE_SESSION): SessionStatus.PAUSED,
    (SessionStatus.PAUSED, SessionEvent.RESUME_SESSION): SessionStatus.IN_PROGRESS,
    (SessionStatus.IN_PROGRESS, SessionEvent.TELEMETRY_TIMEOUT): SessionStatus.STALLED,
    (SessionStatus.IN_PROGRESS, SessionEvent.END_SESSION): SessionStatus.COMPLETED,
    (SessionStatus.PAUSED, SessionEvent.END_SESSION): SessionStatus.COMPLETED,
    (SessionStatus.STALLED, SessionEvent.END_SESSION): SessionStatus.COMPLETED,
    (SessionStatus.SCHEDULED, SessionEvent.CANCEL_TASK): SessionStatus.CANCELLED,
    (SessionStatus.DISPATCHED, SessionEvent.CANCEL_TASK): SessionStatus.CANCELLED,
    (SessionStatus.IN_PROGRESS, SessionEvent.FORCE_CANCEL): SessionStatus.CANCELLED,
    (SessionStatus.PAUSED, SessionEvent.FORCE_CANCEL): SessionStatus.CANCELLED,
    (SessionStatus.STALLED, SessionEvent.FORCE_CANCEL): SessionStatus.CANCELLED,
}


class TransitionError(ValueError):
    """Raised when an FSM event is not valid for the current session state."""


def apply_event(
    current: SessionStatus,
    event: SessionEvent,
) -> SessionStatus:
    """Resolve the next session state for an event.

    Args:
        current: The session's current state.
        event: The event to apply.

    Returns:
        The resulting session state.

    Raises:
        TransitionError: If the event is not permitted from the current state.
    """
    try:
        return TRANSITIONS[(current, event)]
    except KeyError as exc:
        raise TransitionError(
            f"event {event.value} is not valid from state {current.value}"
        ) from exc


def now_utc() -> datetime:
    """Return the current UTC time.

    Returns:
        A timezone-aware UTC timestamp.
    """
    return datetime.now(UTC)
