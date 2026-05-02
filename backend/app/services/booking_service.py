from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.appointment_type import AppointmentType
from app.models.booking import Booking
from app.models.resource import Resource
from app.services.booking_status import ACTIVE_SLOT_STATUSES, CANCELLED, COMPLETED, CONFIRMED, PENDING


def create_booking(
    db: Session,
    customer_id: int,
    appointment_type_id: int,
    resource_id: int | None,
    start_time: datetime,
    capacity: int,
    answers: dict | list | None,
) -> Booking:
    at = db.get(AppointmentType, appointment_type_id)
    if not at or not at.is_published:
        raise ValueError("Appointment not available")
    if at.visibility == "private":
        raise ValueError("Appointment not available")

    if at.appointment_kind == "resource" and resource_id is None:
        raise ValueError("Resource required")

    if resource_id is not None:
        res = db.get(Resource, resource_id)
        if not res or res.appointment_type_id != appointment_type_id:
            raise ValueError("Invalid resource")

    end_time = start_time + timedelta(minutes=at.duration_minutes)

    db.query(Booking).filter(
        Booking.appointment_type_id == appointment_type_id,
        Booking.resource_id == resource_id,
        Booking.status.in_(ACTIVE_SLOT_STATUSES),
        Booking.start_time < end_time,
        Booking.end_time > start_time,
    ).with_for_update().all()

    used = db.execute(
        select(func.coalesce(func.sum(Booking.capacity), 0)).where(
            Booking.appointment_type_id == appointment_type_id,
            Booking.resource_id == resource_id,
            Booking.status.in_(ACTIVE_SLOT_STATUSES),
            Booking.start_time == start_time,
        )
    ).scalar_one()

    if int(used) + capacity > at.max_bookings_per_slot:
        raise ValueError("Slot capacity exceeded")

    status = PENDING if at.manual_confirmation else CONFIRMED
    booking = Booking(
        customer_id=customer_id,
        appointment_type_id=appointment_type_id,
        resource_id=resource_id,
        start_time=start_time,
        end_time=end_time,
        capacity=capacity,
        status=status,
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
    if b.status == CANCELLED:
        return b
    if b.status == COMPLETED:
        raise ValueError("Completed booking cannot be cancelled")
    b.status = CANCELLED
    db.commit()
    db.refresh(b)
    return b


def reschedule_booking(db: Session, booking_id: int, user_id: int, new_start: datetime) -> Booking:
    b = db.get(Booking, booking_id)
    if not b or b.customer_id != user_id:
        raise ValueError("Booking not found")
    if b.status not in ACTIVE_SLOT_STATUSES:
        raise ValueError("Cannot reschedule")

    at = db.get(AppointmentType, b.appointment_type_id)
    if not at:
        raise ValueError("Invalid appointment type")

    end_time = new_start + timedelta(minutes=at.duration_minutes)

    db.query(Booking).filter(
        Booking.appointment_type_id == b.appointment_type_id,
        Booking.resource_id == b.resource_id,
        Booking.status.in_(ACTIVE_SLOT_STATUSES),
        Booking.start_time < end_time,
        Booking.end_time > new_start,
    ).with_for_update().all()

    used = db.execute(
        select(func.coalesce(func.sum(Booking.capacity), 0)).where(
            Booking.appointment_type_id == b.appointment_type_id,
            Booking.resource_id == b.resource_id,
            Booking.status.in_(ACTIVE_SLOT_STATUSES),
            Booking.start_time == new_start,
            Booking.id != b.id,
        )
    ).scalar_one()

    if int(used) + b.capacity > at.max_bookings_per_slot:
        raise ValueError("Slot capacity exceeded")

    b.start_time = new_start
    b.end_time = end_time
    if at.manual_confirmation:
        b.status = PENDING
    db.commit()
    db.refresh(b)
    return b


def organiser_confirm(db: Session, booking_id: int, organiser_id: int, role: str) -> Booking:
    b = db.get(Booking, booking_id)
    if not b:
        raise ValueError("Booking not found")
    at = db.get(AppointmentType, b.appointment_type_id)
    if role != "admin" and (not at or at.organiser_id != organiser_id):
        raise ValueError("Forbidden")
    if b.status == CONFIRMED:
        return b
    if b.status != PENDING:
        raise ValueError("Only pending bookings can be confirmed")
    b.status = CONFIRMED
    db.commit()
    db.refresh(b)
    return b


def mark_completed(db: Session, booking_id: int, user_id: int, role: str) -> Booking:
    b = db.get(Booking, booking_id)
    if not b:
        raise ValueError("Booking not found")
    at = db.get(AppointmentType, b.appointment_type_id)
    if role != "admin" and (not at or at.organiser_id != user_id):
        raise ValueError("Forbidden")
    if b.status == COMPLETED:
        return b
    if b.status != CONFIRMED:
        raise ValueError("Only confirmed bookings can be completed")
    b.status = COMPLETED
    db.commit()
    db.refresh(b)
    return b
