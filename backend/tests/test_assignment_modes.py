"""Tests for assignment_mode auto/manual resource behaviour."""

import os

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-secret")

from datetime import datetime, time, timedelta, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models.appointment_type import AppointmentType
from app.models.booking import Booking
from app.models.resource import Resource
from app.models.schedule import Schedule
from app.models.user import User
from app.services.availability import auto_assign_resource
from app.services.booking_service import create_booking


@pytest.fixture()
def db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()


def _seed(db, assignment_mode="manual"):
    """Create an organiser, customer, appointment type with 2 resources & a weekly schedule."""
    organiser = User(
        full_name="Org", email="org@test.com", password_hash="x", role="organiser"
    )
    customer = User(
        full_name="Cust", email="cust@test.com", password_hash="x", role="customer"
    )
    db.add_all([organiser, customer])
    db.flush()

    at = AppointmentType(
        organiser_id=organiser.id,
        name="Test Service",
        duration_minutes=30,
        appointment_kind="resource",
        assignment_mode=assignment_mode,
        is_published=True,
        max_bookings_per_slot=1,
    )
    db.add(at)
    db.flush()

    r1 = Resource(appointment_type_id=at.id, name="Room A")
    r2 = Resource(appointment_type_id=at.id, name="Room B")
    db.add_all([r1, r2])
    db.flush()

    # Monday 09:00–12:00 schedule (applies to all resources)
    sch = Schedule(
        appointment_type_id=at.id,
        resource_id=None,
        day_of_week=0,  # Monday
        start_time=time(9, 0),
        end_time=time(12, 0),
    )
    db.add(sch)
    db.commit()

    return organiser, customer, at, r1, r2


# ---------------------------------------------------------------------------
# Manual mode
# ---------------------------------------------------------------------------


class TestManualMode:
    def test_manual_requires_resource_id(self, db):
        _, customer, at, r1, _ = _seed(db, "manual")
        slot_start = datetime(2025, 6, 2, 9, 0, tzinfo=timezone.utc)  # Monday

        with pytest.raises(ValueError, match="Resource required"):
            create_booking(db, customer.id, at.id, None, slot_start, 1, None)

    def test_manual_booking_with_resource(self, db):
        _, customer, at, r1, _ = _seed(db, "manual")
        slot_start = datetime(2025, 6, 2, 9, 0, tzinfo=timezone.utc)

        booking = create_booking(db, customer.id, at.id, r1.id, slot_start, 1, None)
        assert booking.resource_id == r1.id
        assert booking.status in ("pending", "confirmed")


# ---------------------------------------------------------------------------
# Auto mode
# ---------------------------------------------------------------------------


class TestAutoMode:
    def test_auto_assigns_resource_when_none_provided(self, db):
        _, customer, at, r1, r2 = _seed(db, "auto")
        slot_start = datetime(2025, 6, 2, 9, 0, tzinfo=timezone.utc)

        booking = create_booking(db, customer.id, at.id, None, slot_start, 1, None)
        assert booking.resource_id in (r1.id, r2.id)

    def test_auto_distributes_across_resources(self, db):
        """When one resource is taken, auto should pick the other."""
        _, customer, at, r1, r2 = _seed(db, "auto")
        slot_start = datetime(2025, 6, 2, 9, 0, tzinfo=timezone.utc)

        b1 = create_booking(db, customer.id, at.id, None, slot_start, 1, None)
        first_resource = b1.resource_id

        b2 = create_booking(db, customer.id, at.id, None, slot_start, 1, None)
        second_resource = b2.resource_id

        assert first_resource != second_resource
        assert {first_resource, second_resource} == {r1.id, r2.id}

    def test_auto_no_resource_available_raises(self, db):
        """Both resources full → error."""
        _, customer, at, r1, r2 = _seed(db, "auto")
        slot_start = datetime(2025, 6, 2, 9, 0, tzinfo=timezone.utc)

        create_booking(db, customer.id, at.id, None, slot_start, 1, None)
        create_booking(db, customer.id, at.id, None, slot_start, 1, None)

        with pytest.raises(ValueError, match="No resource available"):
            create_booking(db, customer.id, at.id, None, slot_start, 1, None)

    def test_auto_explicit_resource_still_works(self, db):
        """Even in auto mode, an explicit resource_id should be honoured."""
        _, customer, at, r1, _ = _seed(db, "auto")
        slot_start = datetime(2025, 6, 2, 9, 0, tzinfo=timezone.utc)

        booking = create_booking(db, customer.id, at.id, r1.id, slot_start, 1, None)
        assert booking.resource_id == r1.id


# ---------------------------------------------------------------------------
# auto_assign_resource unit tests
# ---------------------------------------------------------------------------


class TestAutoAssignResource:
    def test_picks_least_loaded(self, db):
        _, customer, at, r1, r2 = _seed(db, "auto")
        slot_start = datetime(2025, 6, 2, 9, 0, tzinfo=timezone.utc)

        # Pre-book r1 manually
        at.max_bookings_per_slot = 2
        db.commit()
        create_booking(db, customer.id, at.id, r1.id, slot_start, 1, None)

        chosen = auto_assign_resource(db, at.id, slot_start, 1)
        assert chosen == r2.id  # r2 has 0 usage, r1 has 1

    def test_no_resources_raises(self, db):
        organiser = User(
            full_name="Org2", email="org2@test.com", password_hash="x", role="organiser"
        )
        db.add(organiser)
        db.flush()
        at = AppointmentType(
            organiser_id=organiser.id,
            name="Empty",
            duration_minutes=30,
            appointment_kind="resource",
            assignment_mode="auto",
            is_published=True,
            max_bookings_per_slot=1,
        )
        db.add(at)
        db.commit()

        slot_start = datetime(2025, 6, 2, 9, 0, tzinfo=timezone.utc)
        with pytest.raises(ValueError, match="No resources available"):
            auto_assign_resource(db, at.id, slot_start, 1)
