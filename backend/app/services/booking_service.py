from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.appointment_type import AppointmentType
from app.models.booking import Booking
from app.models.question import Question
from app.models.resource import Resource
from app.services.availability import slot_exists_for_start
from app.services.booking_status import ACTIVE_SLOT_STATUSES, CANCELLED, COMPLETED, CONFIRMED, PENDING
from app.services.slot_lock import slot_lock


def _normalize_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        raise ValueError("start_time must include timezone")
    return value.astimezone(timezone.utc).replace(second=0, microsecond=0)


def _required_answer_missing(question: Question, value) -> bool:
    if value is None:
        return True
    if question.field_type == "checkbox":
        return value is not True
    if isinstance(value, str):
        return not value.strip()
    if isinstance(value, (list, tuple, set, dict)):
        return len(value) == 0
    return False


def _validate_required_questions(db: Session, appointment_type_id: int, answers: dict | list | None) -> None:
    required_questions = (
        db.execute(
            select(Question).where(
                Question.appointment_type_id == appointment_type_id,
                Question.is_required.is_(True),
            )
        )
        .scalars()
        .all()
    )
    if not required_questions:
        return

    if not isinstance(answers, dict):
        raise ValueError("Missing required answers: " + ", ".join(q.label for q in required_questions))

    missing_labels: list[str] = []
    for q in required_questions:
        # FE serializes keys as strings; support int and str keys.
        raw = answers.get(q.id, answers.get(str(q.id)))
        if _required_answer_missing(q, raw):
            missing_labels.append(q.label)
    if missing_labels:
        raise ValueError("Missing required answers: " + ", ".join(missing_labels))


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
    _validate_required_questions(db, appointment_type_id, answers)

    start_time = _normalize_utc(start_time)
    with slot_lock(appointment_type_id, resource_id, start_time.isoformat()):
        if not slot_exists_for_start(db, appointment_type_id, resource_id, start_time, tz_name="UTC"):
            raise ValueError("Selected time is not available")

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
                Booking.start_time < end_time,
                Booking.end_time > start_time,
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

    new_start = _normalize_utc(new_start)
    with slot_lock(b.appointment_type_id, b.resource_id, new_start.isoformat()):
        if not slot_exists_for_start(db, b.appointment_type_id, b.resource_id, new_start, tz_name="UTC"):
            raise ValueError("Selected time is not available")

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
