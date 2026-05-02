"""Tests for interval-overlap capacity enforcement in booking_service.

Covers:
  - Same start time → reject when capacity full
  - Shifted overlap (different start, intervals overlap) → reject
  - Boundary touching (end == start of next) → allow
  - Non-overlapping same day → allow
  - Reschedule into overlapping slot → reject
  - Reschedule into non-overlapping slot → allow
  - Cancelled booking frees capacity for overlap window
"""

from datetime import datetime, timedelta, timezone

import pytest

from app.models.appointment_type import AppointmentType
from app.models.booking import Booking
from app.models.schedule import Schedule
from app.models.user import User
from app.services import booking_service
from app.utils.password import hash_password


UTC = timezone.utc
BASE = datetime(2025, 6, 15, 10, 0, tzinfo=UTC)


def _setup(db, *, max_bookings=1, duration=60, kind="user"):
    """Create an organiser, a customer, and a published appointment type."""
    organiser = User(
        full_name="Org", email="org@test.com",
        password_hash=hash_password("x"), role="organiser", is_active=True,
    )
    customer = User(
        full_name="Cust", email="cust@test.com",
        password_hash=hash_password("x"), role="customer", is_active=True,
    )
    db.add_all([organiser, customer])
    db.flush()

    at = AppointmentType(
        organiser_id=organiser.id,
        name="Test",
        duration_minutes=duration,
        appointment_kind=kind,
        is_published=True,
        manage_capacity=True,
        max_bookings_per_slot=max_bookings,
    )
    db.add(at)
    db.flush()
    db.add(
        Schedule(
            appointment_type_id=at.id,
            resource_id=None,
            day_of_week=BASE.weekday(),
            start_time=datetime(2025, 6, 15, 9, 0, tzinfo=UTC).time(),
            end_time=datetime(2025, 6, 15, 18, 0, tzinfo=UTC).time(),
        )
    )
    db.commit()
    return customer, at


# ── create_booking overlap tests ──────────────────────────────────────


def test_same_start_rejects_when_full(db_session):
    """Two bookings at exact same start_time exceed capacity=1."""
    cust, at = _setup(db_session)

    booking_service.create_booking(
        db_session, cust.id, at.id, None, BASE, 1, None,
    )
    with pytest.raises(ValueError, match="capacity"):
        booking_service.create_booking(
            db_session, cust.id, at.id, None, BASE, 1, None,
        )


def test_shifted_overlap_rejects(db_session):
    """Legacy shifted interval overlap still blocks a valid slot booking."""
    cust, at = _setup(db_session, duration=60)

    db_session.add(
        Booking(
            customer_id=cust.id,
            appointment_type_id=at.id,
            resource_id=None,
            start_time=BASE + timedelta(minutes=30),
            end_time=BASE + timedelta(minutes=90),
            capacity=1,
            status="confirmed",
            answers=None,
        )
    )
    db_session.commit()
    with pytest.raises(ValueError, match="capacity"):
        booking_service.create_booking(
            db_session, cust.id, at.id, None, BASE + timedelta(minutes=60), 1, None,
        )


def test_boundary_touching_allowed(db_session):
    """Booking starting exactly when previous ends is NOT overlapping."""
    cust, at = _setup(db_session, duration=60)

    booking_service.create_booking(
        db_session, cust.id, at.id, None, BASE, 1, None,
    )
    # Starts at 11:00, right when the first ends → no overlap
    b2 = booking_service.create_booking(
        db_session, cust.id, at.id, None, BASE + timedelta(minutes=60), 1, None,
    )
    assert b2.start_time.replace(tzinfo=None) == (BASE + timedelta(minutes=60)).replace(tzinfo=None)


def test_non_overlapping_same_day_allowed(db_session):
    """Two bookings hours apart on the same day are fine."""
    cust, at = _setup(db_session, duration=30)

    booking_service.create_booking(
        db_session, cust.id, at.id, None, BASE, 1, None,
    )
    b2 = booking_service.create_booking(
        db_session, cust.id, at.id, None, BASE + timedelta(hours=3), 1, None,
    )
    assert b2 is not None


def test_overlap_allowed_when_capacity_permits(db_session):
    """With max_bookings=2, one legacy overlap + one booking is accepted."""
    cust, at = _setup(db_session, max_bookings=2, duration=60)

    db_session.add(
        Booking(
            customer_id=cust.id,
            appointment_type_id=at.id,
            resource_id=None,
            start_time=BASE + timedelta(minutes=30),
            end_time=BASE + timedelta(minutes=90),
            capacity=1,
            status="confirmed",
            answers=None,
        )
    )
    db_session.commit()

    b2 = booking_service.create_booking(
        db_session, cust.id, at.id, None, BASE + timedelta(minutes=60), 1, None,
    )
    assert b2 is not None

    # Third should fail
    with pytest.raises(ValueError, match="capacity"):
        booking_service.create_booking(
            db_session, cust.id, at.id, None, BASE + timedelta(minutes=60), 1, None,
        )


# ── reschedule overlap tests ─────────────────────────────────────────


def test_reschedule_into_overlap_rejects(db_session):
    """Rescheduling a booking into a slot that overlaps an existing one is rejected."""
    cust, at = _setup(db_session, duration=60)

    b1 = booking_service.create_booking(
        db_session, cust.id, at.id, None, BASE, 1, None,
    )
    b2 = booking_service.create_booking(
        db_session, cust.id, at.id, None, BASE + timedelta(hours=3), 1, None,
    )
    db_session.add(
        Booking(
            customer_id=cust.id,
            appointment_type_id=at.id,
            resource_id=None,
            start_time=BASE + timedelta(minutes=30),
            end_time=BASE + timedelta(minutes=90),
            capacity=1,
            status="confirmed",
            answers=None,
        )
    )
    db_session.commit()
    # Move b2 to a valid slot that overlaps the legacy interval.
    with pytest.raises(ValueError, match="capacity"):
        booking_service.reschedule_booking(
            db_session, b2.id, cust.id, BASE + timedelta(minutes=60),
        )


def test_reschedule_into_non_overlapping_allowed(db_session):
    """Rescheduling to a free slot succeeds."""
    cust, at = _setup(db_session, duration=60)

    b1 = booking_service.create_booking(
        db_session, cust.id, at.id, None, BASE, 1, None,
    )
    b2 = booking_service.create_booking(
        db_session, cust.id, at.id, None, BASE + timedelta(hours=3), 1, None,
    )
    # Move b2 to a non-overlapping time
    updated = booking_service.reschedule_booking(
        db_session, b2.id, cust.id, BASE + timedelta(hours=5),
    )
    assert updated.start_time.replace(tzinfo=None) == (BASE + timedelta(hours=5)).replace(tzinfo=None)


def test_reschedule_same_slot_allowed(db_session):
    """Rescheduling a booking to its own current time should succeed (self-overlap excluded)."""
    cust, at = _setup(db_session, duration=60)

    b = booking_service.create_booking(
        db_session, cust.id, at.id, None, BASE, 1, None,
    )
    updated = booking_service.reschedule_booking(
        db_session, b.id, cust.id, BASE,
    )
    assert updated.start_time.replace(tzinfo=None) == BASE.replace(tzinfo=None)


# ── cancelled booking frees capacity ─────────────────────────────────


def test_cancelled_booking_frees_overlap_capacity(db_session):
    """After cancelling a booking, a new overlapping one should be accepted."""
    cust, at = _setup(db_session, duration=60)

    b1 = booking_service.create_booking(
        db_session, cust.id, at.id, None, BASE, 1, None,
    )
    booking_service.create_booking(
        db_session, cust.id, at.id, None, BASE + timedelta(hours=1), 1, None,
    )
    # Cancel b1
    booking_service.cancel_booking(db_session, b1.id, cust.id, "customer")

    # Now booking the same slot should succeed since cancelled bookings are excluded.
    b2 = booking_service.create_booking(
        db_session, cust.id, at.id, None, BASE, 1, None,
    )
    assert b2 is not None
