from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.models.appointment_type import AppointmentType
from app.models.booking import Booking
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
    is_published: bool = True,
    manual_confirmation: bool = True,
    max_bookings_per_slot: int = 1,
) -> AppointmentType:
    now = datetime.now(timezone.utc).replace(second=0, microsecond=0)
    start_on_hour = now.replace(minute=0) + timedelta(days=1)
    end_on_hour = start_on_hour + timedelta(hours=6)
    appointment = AppointmentType(
        organiser_id=organiser_id,
        name="Consultation",
        description="Test appointment",
        duration_minutes=30,
        appointment_kind="user",
        slot_schedule="weekly",
        is_published=is_published,
        manage_capacity=False,
        advance_payment=False,
        manual_confirmation=manual_confirmation,
        assignment_mode="manual",
        max_bookings_per_slot=max_bookings_per_slot,
        share_link=f"share-{uuid4().hex[:10]}",
    )
    db_session.add(appointment)
    db_session.commit()
    # Ensure availability-based booking validation has a real schedule window.
    db_session.add(
        Schedule(
            appointment_type_id=appointment.id,
            resource_id=None,
            day_of_week=start_on_hour.weekday(),
            start_time=start_on_hour.time(),
            end_time=end_on_hour.time(),
        )
    )
    db_session.commit()
    db_session.refresh(appointment)
    return appointment


def _slot_start(days_ahead: int) -> datetime:
    now = datetime.now(timezone.utc).replace(second=0, microsecond=0)
    return now.replace(minute=0) + timedelta(days=days_ahead)


def test_booking_lifecycle_completed_flow(client, db_session):
    organiser = _create_user(db_session, "organiser@example.com", "organiser")
    admin = _create_user(db_session, "admin@example.com", "admin")
    customer = _create_user(db_session, "customer@example.com", "customer")
    appointment = _create_appointment(db_session, organiser.id, manual_confirmation=True, max_bookings_per_slot=2)

    slot_start = _slot_start(1)
    booking_payload = {
        "appointment_type_id": appointment.id,
        "resource_id": None,
        "start_time": slot_start.isoformat(),
        "capacity": 1,
        "answers": {"note": "lifecycle"},
    }

    created = client.post("/api/bookings", json=booking_payload, headers=_auth_header(customer))
    assert created.status_code == 200
    booking_id = created.json()["id"]
    assert created.json()["status"] == "pending"

    confirmed = client.post(f"/api/bookings/{booking_id}/confirm", headers=_auth_header(organiser))
    assert confirmed.status_code == 200
    assert confirmed.json()["status"] == "confirmed"

    completed = client.post(f"/api/bookings/{booking_id}/complete", headers=_auth_header(admin))
    assert completed.status_code == 200
    assert completed.json()["status"] == "completed"

    cancelled = client.post(f"/api/bookings/{booking_id}/cancel", headers=_auth_header(customer))
    assert cancelled.status_code == 400
    assert cancelled.json()["detail"] == "Completed booking cannot be cancelled"


def test_booking_publication_and_capacity_invariants(client, db_session):
    organiser = _create_user(db_session, "organiser2@example.com", "organiser")
    customer = _create_user(db_session, "customer2@example.com", "customer")
    unpublished = _create_appointment(db_session, organiser.id, is_published=False, manual_confirmation=True)
    published = _create_appointment(
        db_session,
        organiser.id,
        is_published=True,
        manual_confirmation=False,
        max_bookings_per_slot=1,
    )

    slot_start = _slot_start(1)
    blocked_payload = {
        "appointment_type_id": unpublished.id,
        "resource_id": None,
        "start_time": slot_start.isoformat(),
        "capacity": 1,
        "answers": None,
    }
    blocked = client.post("/api/bookings", json=blocked_payload, headers=_auth_header(customer))
    assert blocked.status_code == 400
    assert blocked.json()["detail"] == "Appointment not available"

    first_payload = {
        "appointment_type_id": published.id,
        "resource_id": None,
        "start_time": slot_start.isoformat(),
        "capacity": 1,
        "answers": None,
    }
    first = client.post("/api/bookings", json=first_payload, headers=_auth_header(customer))
    assert first.status_code == 200
    assert first.json()["status"] == "confirmed"

    second = client.post("/api/bookings", json=first_payload, headers=_auth_header(customer))
    assert second.status_code == 400
    assert second.json()["detail"] == "Slot capacity exceeded"


def test_reporting_excludes_cancelled_and_counts_completed(client, db_session):
    organiser = _create_user(db_session, "organiser3@example.com", "organiser")
    customer = _create_user(db_session, "customer3@example.com", "customer")
    appointment = _create_appointment(db_session, organiser.id, manual_confirmation=True, max_bookings_per_slot=4)

    day_slot = datetime.now(timezone.utc).replace(hour=10, minute=0, second=0, microsecond=0)
    end_slot = day_slot + timedelta(minutes=appointment.duration_minutes)
    for status in ("pending", "confirmed", "completed", "cancelled"):
        booking = Booking(
            customer_id=customer.id,
            appointment_type_id=appointment.id,
            resource_id=None,
            start_time=day_slot,
            end_time=end_slot,
            capacity=1,
            status=status,
            answers=None,
        )
        db_session.add(booking)
    db_session.commit()

    summary = client.get("/api/reports/organiser-summary", headers=_auth_header(organiser))
    assert summary.status_code == 200
    payload = summary.json()
    assert payload["total_bookings"] == 3
    assert payload["today_appointments"] == 3
    assert payload["pending_confirmations"] == 1

    insights = client.get("/api/reports/insights", headers=_auth_header(organiser))
    assert insights.status_code == 200
    total_insight_bookings = sum(item["count"] for item in insights.json()["peak_hours"])
    assert total_insight_bookings == 3
