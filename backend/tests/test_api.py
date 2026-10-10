"""Endpoint-level integration tests for the Urban Hound API."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

from app.main import app
from app.store import seed_store
from fastapi.testclient import TestClient

PREFIX = "/api/v1"
START = datetime(2026, 10, 9, 12, 0, 0, tzinfo=UTC)


def _client() -> TestClient:
    seed_store()
    return TestClient(app)


def test_health_and_catalog() -> None:
    with _client() as client:
        assert client.get("/health").json()["status"] == "ok"
        catalog = client.get(f"{PREFIX}/meta/catalog").json()
        assert catalog["props"]
        assert catalog["filters"]


def test_seeded_subjects_are_listed() -> None:
    with _client() as client:
        subjects = client.get(f"{PREFIX}/subjects").json()
        names = {subject["name"] for subject in subjects}
        assert {"Atticus", "Pim"} <= names


def test_full_walk_lifecycle() -> None:
    with _client() as client:
        subject = client.get(f"{PREFIX}/subjects").json()[0]
        owner_id = subject["owner_id"]

        created = client.post(
            f"{PREFIX}/sessions",
            json={"subject_id": subject["subject_id"]},
        )
        assert created.status_code == 201
        session_id = created.json()["session_id"]

        dispatched = client.post(
            f"{PREFIX}/sessions/{session_id}/actions",
            json={"event": "DISPATCH_TASK"},
        )
        assert dispatched.json()["status"] == "DISPATCHED"

        accepted = client.post(
            f"{PREFIX}/sessions/{session_id}/actions",
            json={"event": "ACCEPT_TASK", "agent_id": str(uuid4())},
        )
        assert accepted.json()["status"] == "IN_PROGRESS"

        for offset in range(3):
            ingest = client.post(
                f"{PREFIX}/telemetry/ingest",
                json={
                    "session_id": session_id,
                    "latitude": 40.7359 + offset * 0.001,
                    "longitude": -73.9911 + offset * 0.001,
                    "accuracy_radius_meters": 4.0,
                    "speed_mps": 1.4,
                    "heading_degrees": 45.0,
                    "battery_level_pct": 90,
                    "recorded_at": (START + timedelta(seconds=offset * 60)).isoformat(),
                },
            )
            assert ingest.status_code == 202
            assert ingest.json()["status"] == "ACCEPTED"

        vibe = client.get(f"{PREFIX}/sessions/{session_id}/vibe")
        assert vibe.status_code == 200
        assert vibe.json()["session_id"] == session_id

        trail = client.get(f"{PREFIX}/sessions/{session_id}/trail")
        assert trail.status_code == 200
        assert len(trail.json()["points"]) == 3

        caption = client.post(
            f"{PREFIX}/sessions/status-caption",
            json={
                "session_id": session_id,
                "action": "OVERRIDE",
                "custom_caption": "Sniffing.",
            },
        )
        assert caption.json()["current_caption_text"] == "Sniffing."

        ended = client.post(
            f"{PREFIX}/sessions/{session_id}/actions",
            json={"event": "END_SESSION"},
        )
        assert ended.json()["status"] == "COMPLETED"

        exported = client.post(
            f"{PREFIX}/export/artifact",
            json={"session_id": session_id, "artifact_type": "STOP_MOTION_GIF"},
        )
        assert exported.status_code == 200
        assert exported.json()["native_sms_payload"].startswith("sms:")

        _ = owner_id


def test_telemetry_rejects_poor_accuracy() -> None:
    with _client() as client:
        subject = client.get(f"{PREFIX}/subjects").json()[0]
        session = client.post(
            f"{PREFIX}/sessions",
            json={"subject_id": subject["subject_id"]},
        ).json()
        response = client.post(
            f"{PREFIX}/telemetry/ingest",
            json={
                "session_id": session["session_id"],
                "latitude": 40.0,
                "longitude": -73.0,
                "accuracy_radius_meters": 999.0,
            },
        )
        assert response.json()["status"] == "REJECTED"


def test_incident_broadcast_and_sighting() -> None:
    with _client() as client:
        subject = client.get(f"{PREFIX}/subjects").json()[0]
        incident = client.post(
            f"{PREFIX}/incidents",
            json={
                "subject_id": subject["subject_id"],
                "reporter_id": subject["owner_id"],
                "last_known_latitude": 40.7359,
                "last_known_longitude": -73.9911,
                "search_radius_meters": 5000.0,
                "description": "Last seen near the park.",
            },
        )
        assert incident.status_code == 201
        incident_id = incident.json()["incident_id"]

        sighting = client.post(
            f"{PREFIX}/incidents/{incident_id}/sightings",
            json={
                "incident_id": incident_id,
                "latitude": 40.74,
                "longitude": -73.99,
                "notes": "Spotted near the flower bed.",
            },
        )
        assert sighting.status_code == 201

        sightings = client.get(f"{PREFIX}/incidents/{incident_id}/sightings")
        assert len(sightings.json()) == 1

        resolved = client.post(f"{PREFIX}/incidents/{incident_id}/resolve")
        assert resolved.json()["status"] == "RESOLVED"
