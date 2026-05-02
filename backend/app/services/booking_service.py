from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.appointment_type import AppointmentType
from app.models.booking import Booking
from app.models.resource import Resource
from app.services.availability import slot_exists_for_start


def _normalize_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        raise ValueError("start_time must include timezone")
    return value.astimezone(timezone.utc).replace(second=0, microsecond=0)


def create_booking(
    db: Session,
    customer_id: int,
    appointment_type_id: int,
    resource_id: int | None,
    start_time: datetime,
    capacity: int,
    answers: dict | list | None,
    payment_confirmed: bool = False,
    payment_reference: str | None = None,
) -> Booking:
    at = db.get(AppointmentType, appointment_type_id)
    if not at or not at.is_published:
        raise ValueError("Appointment not available")
    if capacity < 1:
        raise ValueError("capacity must be at least 1")

    if at.appointment_kind == "resource" and resource_id is None:
        raise ValueError("Resource required")
    if at.appointment_kind != "resource" and resource_id is not None:
        raise ValueError("Resource is not allowed for this appointment type")

    if resource_id is not None:
        res = db.get(Resource, resource_id)
        if not res or res.appointment_type_id != appointment_type_id:
            raise ValueError("Invalid resource")
    if at.advance_payment and not payment_confirmed:
        raise ValueError("Payment required before booking confirmation")

    start_time = _normalize_utc(start_time)
    if not slot_exists_for_start(db, appointment_type_id, resource_id, start_time, tz_name="UTC"):
        raise ValueError("Selected time is not available")

    end_time = start_time + timedelta(minutes=at.duration_minutes)

    db.query(Booking).filter(
        Booking.appointment_type_id == appointment_type_id,
        Booking.resource_id == resource_id,
        Booking.status.in_(["pending", "confirmed"]),
        Booking.start_time < end_time,
        Booking.end_time > start_time,
    ).with_for_update().all()

    used = db.execute(
        select(func.coalesce(func.sum(Booking.capacity), 0)).where(
            Booking.appointment_type_id == appointment_type_id,
            Booking.resource_id == resource_id,
            Booking.status.in_(["pending", "confirmed"]),
            Booking.start_time < end_time,
            Booking.end_time > start_time,
        )
    ).scalar_one()

    if int(used) + capacity > at.max_bookings_per_slot:
        raise ValueError("Slot capacity exceeded")

    status = "pending" if at.manual_confirmation else "confirmed"
    booking = Booking(
        customer_id=customer_id,
        appointment_type_id=appointment_type_id,
        resource_id=resource_id,
        start_time=start_time,
        end_time=end_time,
        capacity=capacity,
        status=status,
        payment_status="paid" if at.advance_payment else "not_required",
        payment_reference=payment_reference,
        answers=answers,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


def cancel_booking(db: Session, booking_id: int, user_id: int, role: str) -> Booking:
    b = db.get(Booking, booking_id)
    if not b:
        raise ValueError("Booking not found")
    if role == "admin":
        pass
    elif role == "customer" and b.customer_id != user_id:
        raise ValueError("Forbidden")
    elif role == "organiser":
        at = db.get(AppointmentType, b.appointment_type_id)
        if not at or at.organiser_id != user_id:
            raise ValueError("Forbidden")
    if b.status == "cancelled":
        return b
    b.status = "cancelled"
    db.commit()
    db.refresh(b)
    return b


def reschedule_booking(db: Session, booking_id: int, user_id: int, new_start: datetime) -> Booking:
    b = db.get(Booking, booking_id)
    if not b or b.customer_id != user_id:
        raise ValueError("Booking not found")
    if b.status not in ("pending", "confirmed"):
        raise ValueError("Cannot reschedule")

    at = db.get(AppointmentType, b.appointment_type_id)
    if not at:
        raise ValueError("Invalid appointment type")

    new_start = _normalize_utc(new_start)
    if not slot_exists_for_start(db, b.appointment_type_id, b.resource_id, new_start, tz_name="UTC"):
        raise ValueError("Selected time is not available")

    end_time = new_start + timedelta(minutes=at.duration_minutes)

    db.query(Booking).filter(
        Booking.appointment_type_id == b.appointment_type_id,
        Booking.resource_id == b.resource_id,
        Booking.status.in_(["pending", "confirmed"]),
        Booking.start_time < end_time,
        Booking.end_time > new_start,
    ).with_for_update().all()

    used = db.execute(
        select(func.coalesce(func.sum(Booking.capacity), 0)).where(
            Booking.appointment_type_id == b.appointment_type_id,
            Booking.resource_id == b.resource_id,
            Booking.status.in_(["pending", "confirmed"]),
            Booking.start_time < end_time,
            Booking.end_time > new_start,
            Booking.id != b.id,
        )
    ).scalar_one()

    if int(used) + b.capacity > at.max_bookings_per_slot:
        raise ValueError("Slot capacity exceeded")

    b.start_time = new_start
    b.end_time = end_time
    if at.manual_confirmation:
        b.status = "pending"
    db.commit()
    db.refresh(b)
    return b


def organiser_confirm(db: Session, booking_id: int, organiser_id: int) -> Booking:
    b = db.get(Booking, booking_id)
    if not b:
        raise ValueError("Booking not found")
    at = db.get(AppointmentType, b.appointment_type_id)
    if not at or at.organiser_id != organiser_id:
        raise ValueError("Forbidden")
    b.status = "confirmed"
    db.commit()
    db.refresh(b)
    return b
