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


def _create_appointment(
    db_session,
    organiser_id: int,
    *,
    visibility: str,
    is_published: bool = True,
    appointment_kind: str = "user",
) -> AppointmentType:
    appointment = AppointmentType(
        organiser_id=organiser_id,
        name=f"Service-{visibility}-{uuid4().hex[:6]}",
        description="visibility test",
        duration_minutes=30,
        appointment_kind=appointment_kind,
        slot_schedule="weekly",
        visibility=visibility,
        is_published=is_published,
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


def test_public_endpoint_filters_visibility_modes(client, db_session):
    organiser = _create_user(db_session, "org-vis-list@example.com", "organiser")
    public_appt = _create_appointment(db_session, organiser.id, visibility="public", is_published=True)
    _create_appointment(db_session, organiser.id, visibility="unlisted", is_published=True)
    _create_appointment(db_session, organiser.id, visibility="private", is_published=True)

    resp = client.get("/api/appointments/public")
    assert resp.status_code == 200

    ids = {item["id"] for item in resp.json()}
    assert public_appt.id in ids
    assert len(ids) == 1


def test_unlisted_share_link_access_and_private_hidden(client, db_session):
    organiser = _create_user(db_session, "org-vis-share@example.com", "organiser")
    unlisted_appt = _create_appointment(db_session, organiser.id, visibility="unlisted", is_published=True)
    private_appt = _create_appointment(db_session, organiser.id, visibility="private", is_published=True)

    unlisted_resp = client.get(f"/api/appointments/by-share/{unlisted_appt.share_link}")
    assert unlisted_resp.status_code == 200
    assert unlisted_resp.json()["visibility"] == "unlisted"

    private_resp = client.get(f"/api/appointments/by-share/{private_appt.share_link}")
    assert private_resp.status_code == 404


def test_private_booking_blocked_while_public_and_unlisted_bookable(client, db_session):
    organiser = _create_user(db_session, "org-vis-book@example.com", "organiser")
    customer = _create_user(db_session, "customer-vis-book@example.com", "customer")

    public_appt = _create_appointment(db_session, organiser.id, visibility="public", is_published=True)
    unlisted_appt = _create_appointment(db_session, organiser.id, visibility="unlisted", is_published=True)
    private_appt = _create_appointment(db_session, organiser.id, visibility="private", is_published=True)

    slot_start = (datetime.now(timezone.utc) + timedelta(days=1)).replace(minute=0, second=0, microsecond=0)
    for appt in (public_appt, unlisted_appt, private_appt):
        db_session.add(
            Schedule(
                appointment_type_id=appt.id,
                resource_id=None,
                schedule_mode="weekly",
                day_of_week=slot_start.weekday(),
                slot_date=None,
                start_time=slot_start.time(),
                end_time=(slot_start + timedelta(minutes=30)).time(),
            )
        )
    db_session.commit()

    for appt in (public_appt, unlisted_appt):
        payload = {
            "appointment_type_id": appt.id,
            "resource_id": None,
            "start_time": slot_start.isoformat(),
            "capacity": 1,
            "answers": None,
        }
        resp = client.post("/api/bookings", json=payload, headers=_auth_header(customer))
        assert resp.status_code == 200

    private_payload = {
        "appointment_type_id": private_appt.id,
        "resource_id": None,
        "start_time": slot_start.isoformat(),
        "capacity": 1,
        "answers": None,
    }
    blocked = client.post("/api/bookings", json=private_payload, headers=_auth_header(customer))
    assert blocked.status_code == 400
    assert blocked.json()["detail"] == "Appointment not available"


def test_visibility_defaults_to_public_on_create(client, db_session):
    organiser = _create_user(db_session, "org-vis-default@example.com", "organiser")
    payload = {
        "name": "Visibility default check",
        "description": "default visibility",
        "duration_minutes": 30,
        "appointment_kind": "user",
        "slot_schedule": "weekly",
        "is_published": True,
        "manage_capacity": False,
        "advance_payment": False,
        "manual_confirmation": False,
        "assignment_mode": "manual",
        "max_bookings_per_slot": 1,
    }

    created = client.post("/api/appointments/mine", json=payload, headers=_auth_header(organiser))
    assert created.status_code == 200
    assert created.json()["visibility"] == "public"


def test_embed_share_path_lookup_and_booking_submission(client, db_session):
    organiser = _create_user(db_session, "org-vis-embed@example.com", "organiser")
    customer = _create_user(db_session, "customer-vis-embed@example.com", "customer")
    unlisted_appt = _create_appointment(db_session, organiser.id, visibility="unlisted", is_published=True)

    slot_start = (datetime.now(timezone.utc) + timedelta(days=1)).replace(minute=0, second=0, microsecond=0)
    db_session.add(
        Schedule(
            appointment_type_id=unlisted_appt.id,
            resource_id=None,
            schedule_mode="weekly",
            day_of_week=slot_start.weekday(),
            slot_date=None,
            start_time=slot_start.time(),
            end_time=(slot_start + timedelta(minutes=30)).time(),
        )
    )
    db_session.commit()

    lookup = client.get(f"/api/appointments/by-share/{unlisted_appt.share_link}")
    assert lookup.status_code == 200
    assert lookup.json()["id"] == unlisted_appt.id

    booking_payload = {
        "appointment_type_id": unlisted_appt.id,
        "resource_id": None,
        "start_time": slot_start.isoformat(),
        "capacity": 1,
        "answers": None,
        "share_token": unlisted_appt.share_link,
    }
    booked = client.post("/api/bookings", json=booking_payload, headers=_auth_header(customer))
    assert booked.status_code == 200
