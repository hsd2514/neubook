from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.models.appointment_type import AppointmentType
from app.models.schedule import Schedule
from app.models.user import User
from app.utils.jwt import create_access_token
from app.utils.password import hash_password


def _auth_header(user: User) -> dict[str, str]:
    token = create_access_token(user.id, {"role": user.role})
    return {"Authorization": f"Bearer {token}"}


def _create_user(db_session, email: str, role: str) -> User:
    user = User(
        full_name=f"{role.title()} User",
        email=email,
        password_hash=hash_password("password123"),
        role=role,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _create_appointment(db_session, organiser_id: int) -> AppointmentType:
    appointment = AppointmentType(
        organiser_id=organiser_id,
        name=f"BulkBlock-{uuid4().hex[:6]}",
        description="bulk blocking test",
        duration_minutes=30,
        appointment_kind="user",
        slot_schedule="weekly",
        visibility="public",
        is_published=True,
        manage_capacity=False,
        advance_payment=False,
        manual_confirmation=False,
        assignment_mode="manual",
        max_bookings_per_slot=2,
        share_link=f"share-{uuid4().hex[:8]}",
    )
    db_session.add(appointment)
    db_session.commit()
    db_session.refresh(appointment)
    return appointment


def _add_weekly_window(db_session, appointment_id: int, when: datetime, start: str = "09:00", end: str = "12:00"):
    sh, sm = start.split(":")
    eh, em = end.split(":")
    db_session.add(
        Schedule(
            appointment_type_id=appointment_id,
            resource_id=None,
            schedule_mode="weekly",
            day_of_week=when.weekday(),
            slot_date=None,
            start_time=datetime.strptime(f"{sh}:{sm}", "%H:%M").time(),
            end_time=datetime.strptime(f"{eh}:{em}", "%H:%M").time(),
        )
    )
    db_session.commit()


def _availability_slots(client, appointment_id: int, day_iso: str):
    resp = client.get(
        f"/api/appointments/{appointment_id}/availability",
        params={"from_date": day_iso, "to_date": day_iso, "tz": "UTC"},
    )
    assert resp.status_code == 200
    payload = resp.json()
    if not payload:
        return []
    return payload[0]["slots"]


def test_bulk_block_endpoint_accepts_multiple_ranges(client, db_session):
    organiser = _create_user(db_session, "org-bulk-ranges@example.com", "organiser")
    appt = _create_appointment(db_session, organiser.id)

    payload = [
        {
            "block_type": "one_off",
            "start_date": "2030-01-01",
            "end_date": "2030-01-03",
            "day_of_week": None,
            "start_time": None,
            "end_time": None,
        },
        {
            "block_type": "holiday",
            "start_date": "2030-02-10",
            "end_date": "2030-02-12",
            "day_of_week": None,
            "start_time": None,
            "end_time": None,
        },
    ]
    created = client.post(
        f"/api/appointments/mine/{appt.id}/blocked-slots/bulk",
        json=payload,
        headers=_auth_header(organiser),
    )
    assert created.status_code == 200
    assert len(created.json()) == 2


def test_availability_excludes_recurring_and_one_off_overlaps(client, db_session):
    organiser = _create_user(db_session, "org-bulk-overlap@example.com", "organiser")
    appt = _create_appointment(db_session, organiser.id)

    target_dt = (datetime.now(timezone.utc) + timedelta(days=3)).replace(hour=9, minute=0, second=0, microsecond=0)
    target_day = target_dt.date().isoformat()
    _add_weekly_window(db_session, appt.id, target_dt, "09:00", "12:00")

    # Baseline: 6 slots in a 3-hour window with 30-min duration
    before_slots = _availability_slots(client, appt.id, target_day)
    assert len(before_slots) == 6

    blocked = client.post(
        f"/api/appointments/mine/{appt.id}/blocked-slots/bulk",
        json=[
            {
                "block_type": "recurring",
                "start_date": target_day,
                "end_date": (target_dt.date() + timedelta(days=21)).isoformat(),
                "day_of_week": target_dt.weekday(),
                "start_time": "09:00",
                "end_time": "10:00",
            },
            {
                "block_type": "one_off",
                "start_date": target_day,
                "end_date": target_day,
                "day_of_week": None,
                "start_time": "10:00",
                "end_time": "11:00",
            },
        ],
        headers=_auth_header(organiser),
    )
    assert blocked.status_code == 200

    after_slots = _availability_slots(client, appt.id, target_day)
    starts = {slot["start"][11:16] for slot in after_slots}
    assert starts == {"11:00", "11:30"}


def test_holiday_full_day_block_removes_all_slots(client, db_session):
    organiser = _create_user(db_session, "org-bulk-holiday@example.com", "organiser")
    appt = _create_appointment(db_session, organiser.id)

    target_dt = (datetime.now(timezone.utc) + timedelta(days=5)).replace(hour=9, minute=0, second=0, microsecond=0)
    target_day = target_dt.date().isoformat()
    _add_weekly_window(db_session, appt.id, target_dt, "09:00", "11:00")

    baseline = _availability_slots(client, appt.id, target_day)
    assert len(baseline) == 4

    blocked = client.post(
        f"/api/appointments/mine/{appt.id}/blocked-slots/bulk",
        json=[
            {
                "block_type": "holiday",
                "start_date": target_day,
                "end_date": target_day,
                "day_of_week": None,
                "start_time": None,
                "end_time": None,
            }
        ],
        headers=_auth_header(organiser),
    )
    assert blocked.status_code == 200

    assert _availability_slots(client, appt.id, target_day) == []
