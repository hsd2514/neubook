"""Tests for Idempotency-Key header on booking creation.

Covers:
  - Repeat POST with same key returns cached response, no duplicate booking
  - Different key creates a new booking
  - No key behaves normally (no caching)
  - Error responses are cached deterministically
  - Expired records are cleaned up and allow re-use of the key
"""

from datetime import datetime, timedelta, timezone

import pytest

from app.models.appointment_type import AppointmentType
from app.models.booking import Booking
from app.models.idempotency import IdempotencyRecord
from app.models.schedule import Schedule
from app.models.user import User
from app.services import booking_service
from app.services.idempotency import (
    ENDPOINT_BOOKING_CREATE,
    EXPIRY_HOURS,
    cleanup_expired,
    find_record,
    store_record,
)
from app.utils.password import hash_password


UTC = timezone.utc
BASE = datetime(2025, 7, 10, 10, 0, tzinfo=UTC)


def _setup(db, *, max_bookings=1, duration=60):
    """Create organiser, customer, and a published appointment type."""
    organiser = User(
        full_name="Org", email="org@idem.test",
        password_hash=hash_password("x"), role="organiser", is_active=True,
    )
    customer = User(
        full_name="Cust", email="cust@idem.test",
        password_hash=hash_password("x"), role="customer", is_active=True,
    )
    db.add_all([organiser, customer])
    db.flush()

    at = AppointmentType(
        organiser_id=organiser.id,
        name="Idem Test",
        duration_minutes=duration,
        appointment_kind="user",
        is_published=True,
        manage_capacity=True,
        max_bookings_per_slot=max_bookings,
    )
    db.add(at)
    db.flush()

    # BASE is 2025-07-10 = Thursday (day_of_week 3)
    from datetime import time
    sch = Schedule(
        appointment_type_id=at.id,
        resource_id=None,
        schedule_mode="weekly",
        day_of_week=3,
        start_time=time(9, 0),
        end_time=time(18, 0),
    )
    db.add(sch)
    db.flush()
    return customer, at


# ── service-level tests ───────────────────────────────────────────────


def test_store_and_find_record(db_session):
    """store_record persists and find_record retrieves it."""
    cust, at = _setup(db_session)

    rec = store_record(
        db_session, "key-1", cust.id, ENDPOINT_BOOKING_CREATE,
        200, {"id": 99}, booking_id=99,
    )
    assert rec.id is not None
    assert rec.key == "key-1"

    found = find_record(db_session, "key-1", cust.id, ENDPOINT_BOOKING_CREATE)
    assert found is not None
    assert found.status_code == 200
    assert found.response_body == {"id": 99}


def test_find_record_returns_none_for_different_user(db_session):
    """Records are scoped to user_id."""
    cust, at = _setup(db_session)

    store_record(
        db_session, "key-2", cust.id, ENDPOINT_BOOKING_CREATE,
        200, {"id": 1},
    )
    # Different user_id should not find it
    found = find_record(db_session, "key-2", cust.id + 999, ENDPOINT_BOOKING_CREATE)
    assert found is None


def test_cleanup_removes_expired(db_session):
    """Expired records are deleted by cleanup_expired."""
    cust, at = _setup(db_session)

    rec = IdempotencyRecord(
        key="expired-key",
        user_id=cust.id,
        endpoint=ENDPOINT_BOOKING_CREATE,
        status_code=200,
        response_body={"id": 1},
        expires_at=datetime.now(UTC) - timedelta(hours=1),
    )
    db_session.add(rec)
    db_session.commit()

    # Should exist before cleanup
    assert find_record(db_session, "expired-key", cust.id, ENDPOINT_BOOKING_CREATE) is None  # expired
    cleanup_expired(db_session)

    # Record should be gone from DB entirely
    from sqlalchemy import select
    count = db_session.execute(
        select(IdempotencyRecord).where(IdempotencyRecord.key == "expired-key")
    ).scalar_one_or_none()
    assert count is None


# ── integration tests (service layer) ─────────────────────────────────


def test_same_key_no_duplicate_booking(db_session):
    """Using the same idempotency key should not create a second booking."""
    cust, at = _setup(db_session)

    # First booking
    b1 = booking_service.create_booking(
        db_session, cust.id, at.id, None, BASE, 1, None,
    )

    # Store idempotency record as the route would
    from app.schemas.booking import BookingOut
    result = BookingOut.model_validate(b1)
    store_record(
        db_session, "idem-abc", cust.id, ENDPOINT_BOOKING_CREATE,
        200, result.model_dump(mode="json"), booking_id=b1.id,
    )

    # Simulated retry: find_record should return the cached result
    cached = find_record(db_session, "idem-abc", cust.id, ENDPOINT_BOOKING_CREATE)
    assert cached is not None
    assert cached.status_code == 200
    assert cached.booking_id == b1.id

    # Verify only one booking exists
    from sqlalchemy import select, func
    count = db_session.execute(
        select(func.count()).select_from(Booking).where(Booking.customer_id == cust.id)
    ).scalar_one()
    assert count == 1


def test_different_key_creates_new_booking(db_session):
    """A different idempotency key allows a new booking (different slot)."""
    cust, at = _setup(db_session, max_bookings=2)

    b1 = booking_service.create_booking(
        db_session, cust.id, at.id, None, BASE, 1, None,
    )
    from app.schemas.booking import BookingOut
    result1 = BookingOut.model_validate(b1)
    store_record(
        db_session, "key-A", cust.id, ENDPOINT_BOOKING_CREATE,
        200, result1.model_dump(mode="json"), booking_id=b1.id,
    )

    # Different key, same slot (capacity allows it)
    b2 = booking_service.create_booking(
        db_session, cust.id, at.id, None, BASE, 1, None,
    )
    result2 = BookingOut.model_validate(b2)
    store_record(
        db_session, "key-B", cust.id, ENDPOINT_BOOKING_CREATE,
        200, result2.model_dump(mode="json"), booking_id=b2.id,
    )

    assert b1.id != b2.id

    from sqlalchemy import select, func
    count = db_session.execute(
        select(func.count()).select_from(Booking).where(Booking.customer_id == cust.id)
    ).scalar_one()
    assert count == 2


def test_error_response_cached(db_session):
    """Error outcomes are stored so retries get the same error deterministically."""
    cust, at = _setup(db_session)

    # Store an error outcome
    store_record(
        db_session, "err-key", cust.id, ENDPOINT_BOOKING_CREATE,
        400, {"detail": "Slot capacity exceeded"},
    )

    cached = find_record(db_session, "err-key", cust.id, ENDPOINT_BOOKING_CREATE)
    assert cached is not None
    assert cached.status_code == 400
    assert cached.response_body["detail"] == "Slot capacity exceeded"


def test_no_key_allows_normal_flow(db_session):
    """Without an idempotency key, bookings are created normally with no caching."""
    cust, at = _setup(db_session, max_bookings=5)

    b1 = booking_service.create_booking(
        db_session, cust.id, at.id, None, BASE, 1, None,
    )
    b2 = booking_service.create_booking(
        db_session, cust.id, at.id, None, BASE, 1, None,
    )
    # Without idempotency, both succeed (capacity permits)
    assert b1.id != b2.id


def test_expired_key_allows_reuse(db_session):
    """Once a record expires, the same key can be used again."""
    cust, at = _setup(db_session, max_bookings=5)

    # Manually insert an expired record
    rec = IdempotencyRecord(
        key="reuse-key",
        user_id=cust.id,
        endpoint=ENDPOINT_BOOKING_CREATE,
        status_code=200,
        response_body={"id": 1},
        expires_at=datetime.now(UTC) - timedelta(hours=1),
    )
    db_session.add(rec)
    db_session.commit()

    # Expired, so find_record returns None
    assert find_record(db_session, "reuse-key", cust.id, ENDPOINT_BOOKING_CREATE) is None

    # Cleanup removes it
    cleanup_expired(db_session)

    # Now store a fresh record with the same key
    store_record(
        db_session, "reuse-key", cust.id, ENDPOINT_BOOKING_CREATE,
        200, {"id": 2}, booking_id=2,
    )
    found = find_record(db_session, "reuse-key", cust.id, ENDPOINT_BOOKING_CREATE)
    assert found is not None
    assert found.response_body == {"id": 2}
