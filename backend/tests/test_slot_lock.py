from datetime import datetime, timezone

from app.models.appointment_type import AppointmentType
from app.models.resource import Resource
from app.models.schedule import Schedule
from app.models.user import User
from app.services.booking_service import create_booking
from app.services.slot_lock import slot_lock, slot_lock_manager
from app.utils.password import hash_password


def _seed_for_lock_tests(db_session):
    organiser = User(
        full_name="Lock Org",
        email="lock-org@example.com",
        password_hash=hash_password("password123"),
        role="organiser",
        is_active=True,
    )
    customer = User(
        full_name="Lock Cust",
        email="lock-cust@example.com",
        password_hash=hash_password("password123"),
        role="customer",
        is_active=True,
    )
    db_session.add_all([organiser, customer])
    db_session.flush()

    appt = AppointmentType(
        organiser_id=organiser.id,
        name="Lock Dental",
        description="Lock test",
        duration_minutes=30,
        appointment_kind="resource",
        slot_schedule="weekly",
        is_published=True,
        max_bookings_per_slot=2,
    )
    db_session.add(appt)
    db_session.flush()

    resource = Resource(appointment_type_id=appt.id, name="Lock Room", working_hours=None)
    db_session.add(resource)
    db_session.flush()

    db_session.add(
        Schedule(
            appointment_type_id=appt.id,
            resource_id=resource.id,
            day_of_week=0,
            start_time=datetime(2026, 1, 5, 10, 0, tzinfo=timezone.utc).time(),
            end_time=datetime(2026, 1, 5, 11, 0, tzinfo=timezone.utc).time(),
        )
    )
    db_session.commit()
    return customer, appt, resource


def test_slot_lock_blocks_when_key_is_already_held():
    with slot_lock(999, 1, "2026-01-05T10:00:00+00:00"):
        try:
            with slot_lock(999, 1, "2026-01-05T10:00:00+00:00"):
                assert False, "Expected contention error"
        except ValueError as exc:
            assert str(exc) == "Slot is being booked right now. Please retry."


def test_create_booking_returns_retryable_error_on_lock_contention(db_session, monkeypatch):
    customer, appt, resource = _seed_for_lock_tests(db_session)
    start = datetime(2026, 1, 5, 10, 0, tzinfo=timezone.utc)

    def deny_acquire(_key: str):
        return (None, None)

    monkeypatch.setattr(slot_lock_manager, "acquire", deny_acquire)

    try:
        create_booking(
            db_session,
            customer.id,
            appt.id,
            resource.id,
            start,
            capacity=1,
            answers=None,
        )
        assert False, "Expected lock contention error"
    except ValueError as exc:
        assert str(exc) == "Slot is being booked right now. Please retry."
