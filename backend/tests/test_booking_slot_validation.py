from datetime import datetime, timedelta, timezone

from app.models.appointment_type import AppointmentType
from app.models.booking import Booking
from app.models.resource import Resource
from app.models.schedule import Schedule
from app.models.user import User
from app.services.booking_service import create_booking, reschedule_booking
from app.utils.password import hash_password


def _seed_resource_appointment(db_session):
    organiser = User(
        full_name="Org",
        email="org@example.com",
        password_hash=hash_password("password123"),
        role="organiser",
        is_active=True,
    )
    customer = User(
        full_name="Cust",
        email="cust@example.com",
        password_hash=hash_password("password123"),
        role="customer",
        is_active=True,
    )
    db_session.add_all([organiser, customer])
    db_session.flush()

    appt = AppointmentType(
        organiser_id=organiser.id,
        name="Dental",
        description="Dental care",
        duration_minutes=30,
        appointment_kind="resource",
        slot_schedule="weekly",
        is_published=True,
        max_bookings_per_slot=2,
    )
    db_session.add(appt)
    db_session.flush()

    resource = Resource(appointment_type_id=appt.id, name="Room A", working_hours=None)
    db_session.add(resource)
    db_session.flush()

    # Monday 10:00-11:00 UTC gives slots at 10:00 and 10:30 for 30-minute duration.
    schedule = Schedule(
        appointment_type_id=appt.id,
        resource_id=resource.id,
        day_of_week=0,
        start_time=datetime(2026, 1, 5, 10, 0, tzinfo=timezone.utc).time(),
        end_time=datetime(2026, 1, 5, 11, 0, tzinfo=timezone.utc).time(),
    )
    db_session.add(schedule)
    db_session.commit()
    return customer, appt, resource


def test_create_booking_rejects_non_slot_start(db_session):
    customer, appt, resource = _seed_resource_appointment(db_session)
    bad_start = datetime(2026, 1, 5, 10, 15, tzinfo=timezone.utc)

    try:
        create_booking(
            db_session,
            customer.id,
            appt.id,
            resource.id,
            bad_start,
            capacity=1,
            answers=None,
        )
        assert False, "Expected ValueError for invalid slot"
    except ValueError as exc:
        assert str(exc) == "Selected time is not available"


def test_create_booking_accepts_valid_slot_start(db_session):
    customer, appt, resource = _seed_resource_appointment(db_session)
    good_start = datetime(2026, 1, 5, 10, 30, tzinfo=timezone.utc)

    booking = create_booking(
        db_session,
        customer.id,
        appt.id,
        resource.id,
        good_start,
        capacity=1,
        answers=None,
    )
    assert booking.id is not None
    assert booking.start_time.replace(tzinfo=timezone.utc) == good_start


def test_reschedule_rejects_non_slot_start(db_session):
    customer, appt, resource = _seed_resource_appointment(db_session)
    booking = create_booking(
        db_session,
        customer.id,
        appt.id,
        resource.id,
        datetime(2026, 1, 5, 10, 0, tzinfo=timezone.utc),
        capacity=1,
        answers=None,
    )

    try:
        reschedule_booking(
            db_session,
            booking.id,
            customer.id,
            datetime(2026, 1, 5, 10, 45, tzinfo=timezone.utc),
        )
        assert False, "Expected ValueError for invalid reschedule slot"
    except ValueError as exc:
        assert str(exc) == "Selected time is not available"


def test_create_booking_requires_timezone(db_session):
    customer, appt, resource = _seed_resource_appointment(db_session)
    naive = datetime(2026, 1, 5, 10, 0)

    try:
        create_booking(
            db_session,
            customer.id,
            appt.id,
            resource.id,
            naive,
            capacity=1,
            answers=None,
        )
        assert False, "Expected ValueError for naive datetime"
    except ValueError as exc:
        assert str(exc) == "start_time must include timezone"


def test_create_booking_rejects_shifted_overlap_capacity(db_session):
    customer, appt, resource = _seed_resource_appointment(db_session)
    appt.max_bookings_per_slot = 1
    db_session.flush()

    # Legacy/externally inserted overlap that does not align to slot boundaries.
    db_session.add(
        Booking(
            customer_id=customer.id,
            appointment_type_id=appt.id,
            resource_id=resource.id,
            start_time=datetime(2026, 1, 5, 10, 15, tzinfo=timezone.utc),
            end_time=datetime(2026, 1, 5, 10, 45, tzinfo=timezone.utc),
            capacity=1,
            status="confirmed",
            answers=None,
        )
    )
    db_session.commit()

    try:
        create_booking(
            db_session,
            customer.id,
            appt.id,
            resource.id,
            datetime(2026, 1, 5, 10, 30, tzinfo=timezone.utc),
            capacity=1,
            answers=None,
        )
        assert False, "Expected ValueError for overlap capacity"
    except ValueError as exc:
        assert str(exc) == "Slot capacity exceeded"


def test_create_booking_requires_payment_when_appointment_has_advance_payment(db_session):
    customer, appt, resource = _seed_resource_appointment(db_session)
    appt.advance_payment = True
    db_session.commit()

    try:
        create_booking(
            db_session,
            customer.id,
            appt.id,
            resource.id,
            datetime(2026, 1, 5, 10, 30, tzinfo=timezone.utc),
            capacity=1,
            answers=None,
            payment_confirmed=False,
            payment_reference=None,
        )
        assert False, "Expected ValueError when payment is required"
    except ValueError as exc:
        assert str(exc) == "Payment required before booking confirmation"


def test_create_booking_sets_paid_status_when_payment_confirmed(db_session):
    customer, appt, resource = _seed_resource_appointment(db_session)
    appt.advance_payment = True
    db_session.commit()

    booking = create_booking(
        db_session,
        customer.id,
        appt.id,
        resource.id,
        datetime(2026, 1, 5, 10, 30, tzinfo=timezone.utc),
        capacity=1,
        answers=None,
        payment_confirmed=True,
        payment_reference="txn_42",
    )
    assert booking.payment_status == "paid"
    assert booking.payment_reference == "txn_42"
