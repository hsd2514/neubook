from datetime import date, timedelta
from uuid import uuid4

from app.models.user import User
from app.utils.jwt import create_access_token
from app.utils.password import hash_password


def _auth_header(user: User) -> dict[str, str]:
    token = create_access_token(user.id, {"role": user.role})
    return {"Authorization": f"Bearer {token}"}


def _create_organiser(db_session, email: str = "organiser-schedule@example.com") -> User:
    user = User(
        full_name="Schedule Organiser",
        email=email,
        password_hash=hash_password("password123"),
        role="organiser",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _create_appointment(client, organiser: User, *, slot_schedule: str = "weekly") -> int:
    payload = {
        "name": f"Consultation-{uuid4().hex[:6]}",
        "description": "Schedule mode test",
        "duration_minutes": 30,
        "appointment_kind": "user",
        "slot_schedule": slot_schedule,
        "is_published": True,
        "manage_capacity": False,
        "advance_payment": False,
        "manual_confirmation": False,
        "assignment_mode": "manual",
        "max_bookings_per_slot": 1,
    }
    resp = client.post("/api/appointments/mine", json=payload, headers=_auth_header(organiser))
    assert resp.status_code == 200
    return resp.json()["id"]


def _next_weekday(start: date, weekday: int) -> date:
    days_ahead = (weekday - start.weekday()) % 7
    return start + timedelta(days=days_ahead)


def test_weekly_schedule_availability_unchanged(client, db_session):
    organiser = _create_organiser(db_session)
    appointment_id = _create_appointment(client, organiser, slot_schedule="weekly")

    target_day = _next_weekday(date.today() + timedelta(days=1), 2)  # Wednesday
    schedule_payload = {
        "day_of_week": 2,
        "start_time": "09:00",
        "end_time": "10:00",
    }
    created = client.post(
        f"/api/appointments/mine/{appointment_id}/schedules",
        json=schedule_payload,
        headers=_auth_header(organiser),
    )
    assert created.status_code == 200
    assert created.json()["schedule_mode"] == "weekly"
    assert created.json()["day_of_week"] == 2
    assert created.json()["slot_date"] is None

    availability = client.get(
        f"/api/appointments/{appointment_id}/availability"
        f"?from_date={target_day.isoformat()}&to_date={target_day.isoformat()}&tz=UTC"
    )
    assert availability.status_code == 200
    rows = availability.json()
    assert len(rows) == 1
    assert rows[0]["date"] == target_day.isoformat()
    assert len(rows[0]["slots"]) == 2


def test_flexible_schedule_availability_and_overlap_dedup(client, db_session):
    organiser = _create_organiser(db_session, email="organiser-flex@example.com")
    appointment_id = _create_appointment(client, organiser, slot_schedule="flexible")

    target_day = date.today() + timedelta(days=3)

    invalid_payload = {
        "schedule_mode": "flexible",
        "start_time": "10:00",
        "end_time": "11:00",
    }
    invalid = client.post(
        f"/api/appointments/mine/{appointment_id}/schedules",
        json=invalid_payload,
        headers=_auth_header(organiser),
    )
    assert invalid.status_code == 422

    flexible_payload = {
        "schedule_mode": "flexible",
        "slot_date": target_day.isoformat(),
        "start_time": "10:00",
        "end_time": "11:00",
    }
    created_flexible = client.post(
        f"/api/appointments/mine/{appointment_id}/schedules",
        json=flexible_payload,
        headers=_auth_header(organiser),
    )
    assert created_flexible.status_code == 200
    assert created_flexible.json()["schedule_mode"] == "flexible"
    assert created_flexible.json()["day_of_week"] is None
    assert created_flexible.json()["slot_date"] == target_day.isoformat()

    overlapping_weekly_payload = {
        "schedule_mode": "weekly",
        "day_of_week": target_day.weekday(),
        "start_time": "10:00",
        "end_time": "11:00",
    }
    created_weekly = client.post(
        f"/api/appointments/mine/{appointment_id}/schedules",
        json=overlapping_weekly_payload,
        headers=_auth_header(organiser),
    )
    assert created_weekly.status_code == 200

    availability = client.get(
        f"/api/appointments/{appointment_id}/availability"
        f"?from_date={target_day.isoformat()}&to_date={target_day.isoformat()}&tz=UTC"
    )
    assert availability.status_code == 200
    rows = availability.json()
    assert len(rows) == 1
    slots = rows[0]["slots"]
    assert len(slots) == 2
    assert "T10:00:00" in slots[0]["start"]
    assert "T10:30:00" in slots[1]["start"]
