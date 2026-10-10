"""Tests for the TaskSession finite state machine."""

import pytest
from app.models import SessionStatus
from app.schemas import SessionEvent
from app.services.session_fsm import TransitionError, apply_event


def test_dispatch_then_accept() -> None:
    assert (
        apply_event(SessionStatus.SCHEDULED, SessionEvent.DISPATCH_TASK)
        is SessionStatus.DISPATCHED
    )
    assert (
        apply_event(SessionStatus.DISPATCHED, SessionEvent.ACCEPT_TASK)
        is SessionStatus.IN_PROGRESS
    )


def test_pause_and_resume() -> None:
    assert (
        apply_event(SessionStatus.IN_PROGRESS, SessionEvent.PAUSE_SESSION)
        is SessionStatus.PAUSED
    )
    assert (
        apply_event(SessionStatus.PAUSED, SessionEvent.RESUME_SESSION)
        is SessionStatus.IN_PROGRESS
    )


def test_timeout_stalls_then_completes() -> None:
    assert (
        apply_event(SessionStatus.IN_PROGRESS, SessionEvent.TELEMETRY_TIMEOUT)
        is SessionStatus.STALLED
    )
    assert (
        apply_event(SessionStatus.STALLED, SessionEvent.END_SESSION)
        is SessionStatus.COMPLETED
    )


def test_cancel_from_scheduled() -> None:
    assert (
        apply_event(SessionStatus.SCHEDULED, SessionEvent.CANCEL_TASK)
        is SessionStatus.CANCELLED
    )


def test_invalid_transition_raises() -> None:
    with pytest.raises(TransitionError):
        apply_event(SessionStatus.SCHEDULED, SessionEvent.ACCEPT_TASK)
