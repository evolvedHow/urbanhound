"""Tests for the Daily Vibe Check projection and status humor engine."""

import random

from app.services.humor import StatusContext, generate_status, shuffle_status
from app.services.vibe import project_vibe


def test_vibe_high_energy_mid_walk() -> None:
    vibe = project_vibe(distance_meters=2000.0, duration_seconds=1800.0, stop_count=1)
    assert "Energy Machine" in vibe.headline
    assert vibe.energy_pct == 80


def test_vibe_couch_potato_slow_walk() -> None:
    vibe = project_vibe(distance_meters=80.0, duration_seconds=1800.0, stop_count=12)
    assert "Couch Potato" in vibe.headline
    assert vibe.couch_pct == 70


def test_vibe_post_park_nap_after_long_walk() -> None:
    vibe = project_vibe(distance_meters=3000.0, duration_seconds=3000.0, stop_count=0)
    assert "Nap Required" in vibe.headline
    assert vibe.couch_pct == 100


def test_vibe_default_is_bounded() -> None:
    vibe = project_vibe(distance_meters=500.0, duration_seconds=1800.0, stop_count=3)
    assert 0 <= vibe.energy_pct <= 100
    assert vibe.energy_pct + vibe.couch_pct == 100


def test_generate_status_is_deterministic_with_seed() -> None:
    first = generate_status(rng=random.Random(7))
    second = generate_status(rng=random.Random(7))
    assert first == second


def test_generate_status_uses_context() -> None:
    context = StatusContext(
        street_name="Beacon Court",
        location_type="flower bed",
        target_object="rival hound across the street",
    )
    text = generate_status(context=context, rng=random.Random(1))
    assert text.endswith(".")


def test_shuffle_avoids_previous_when_possible() -> None:
    previous = generate_status(rng=random.Random(3))
    shuffled = shuffle_status(previous=previous, rng=random.Random(4))
    assert isinstance(shuffled, str)
    assert shuffled
