from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.appointment_type import AppointmentType
from app.models.booking import Booking
from app.models.booking_seat import BookingSeat
from app.models.question import Question
from app.models.resource import Resource
from app.models.seat import Seat
from app.models.user import User
from app.services.availability import auto_assign_resource, slot_exists_for_start
from app.services.booking_status import ACTIVE_SLOT_STATUSES, CANCELLED, COMPLETED, CONFIRMED, PENDING
from app.services.email_service import send_email
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
        raw = answers.get(q.id, answers.get(str(q.id)))
        if _required_answer_missing(q, raw):
            missing_labels.append(q.label)
    if missing_labels:
        raise ValueError("Missing required answers: " + ", ".join(missing_labels))


def _send_booking_email(
    db: Session,
    booking: Booking,
    appointment_type: AppointmentType,
    subject: str,
    customer_line: str,
    organiser_line: str,
) -> None:
    customer = db.get(User, booking.customer_id)
    organiser = db.get(User, appointment_type.organiser_id)
    when = booking.start_time.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    service_name = appointment_type.name
    base = f"Service: {service_name}\nWhen: {when}\nBooking ID: {booking.id}\n"

    if customer:
        send_email(
            customer.email,
            subject,
            f"Hi {customer.full_name},\n\n{customer_line}\n\n{base}",
        )
    if organiser:
        send_email(
            organiser.email,
            subject,
            f"Hi {organiser.full_name},\n\n{organiser_line}\n\n{base}",
        )


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
    share_token: str | None = None,
    seat_ids: list[int] | None = None,
) -> Booking:
    at = db.get(AppointmentType, appointment_type_id)
    if not at:
        raise ValueError("Appointment not available")
    if not at.is_published:
        if not share_token or at.share_link != share_token:
            raise ValueError("Appointment not available")
    elif at.visibility == "private":
        raise ValueError("Appointment not available")
    if capacity < 1:
        raise ValueError("capacity must be at least 1")
    start_time = _normalize_utc(start_time)
    seat_ids = seat_ids or []

    if at.appointment_kind == "resource" and resource_id is None:
        if at.assignment_mode == "auto":
            resource_id = auto_assign_resource(db, appointment_type_id, start_time, capacity)
        else:
            raise ValueError("Resource required")
    if at.appointment_kind != "resource" and resource_id is not None:
        raise ValueError("Resource is not allowed for this appointment type")

    if resource_id is not None:
        res = db.get(Resource, resource_id)
        if not res or res.appointment_type_id != appointment_type_id:
            raise ValueError("Invalid resource")

    selected_seats: list[Seat] = []
    if at.booking_mode == "seat_map":
        if not seat_ids:
            raise ValueError("At least one seat must be selected")
        selected_seats = (
            db.execute(
                select(Seat).where(
                    Seat.appointment_type_id == appointment_type_id,
                    Seat.id.in_(seat_ids),
                    Seat.status == "active",
                )
            )
            .scalars()
            .all()
        )
        if len(selected_seats) != len(set(seat_ids)):
            raise ValueError("One or more selected seats are invalid")
        if resource_id is not None:
            for seat in selected_seats:
                if seat.resource_id not in (None, resource_id):
                    raise ValueError("Selected seat does not belong to chosen resource")
        capacity = len(selected_seats)
    if at.advance_payment and not payment_confirmed:
        raise ValueError("Payment required before booking confirmation")
    _validate_required_questions(db, appointment_type_id, answers)

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

        if at.booking_mode == "seat_map":
            total_active_seats = db.execute(
                select(func.count()).select_from(Seat).where(
                    Seat.appointment_type_id == appointment_type_id,
                    Seat.status == "active",
                )
            ).scalar_one()
            slot_limit = int(total_active_seats) if total_active_seats > 0 else at.max_bookings_per_slot
        else:
            slot_limit = at.max_bookings_per_slot

        if int(used) + capacity > slot_limit:
            raise ValueError("Slot capacity exceeded")

        if at.booking_mode == "seat_map" and seat_ids:
            conflicting = (
                db.query(BookingSeat)
                .join(Booking, Booking.id == BookingSeat.booking_id)
                .filter(
                    Booking.appointment_type_id == appointment_type_id,
                    Booking.status.in_(ACTIVE_SLOT_STATUSES),
                    Booking.start_time < end_time,
                    Booking.end_time > start_time,
                    BookingSeat.seat_id.in_(seat_ids),
                )
                .with_for_update()
                .all()
            )
            if conflicting:
                raise ValueError("One or more selected seats are no longer available")

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
        db.flush()
        if at.booking_mode == "seat_map" and selected_seats:
            for seat in selected_seats:
                db.add(BookingSeat(booking_id=booking.id, seat_id=seat.id))
        db.commit()
        db.refresh(booking)
        if at.booking_mode == "seat_map" and seat_ids:
            try:
                from app.services.seat_hold import release_seats
                release_seats(at.id, start_time.isoformat(), seat_ids, customer_id)
            except Exception:
                pass  # non-critical
        _send_booking_email(
            db,
            booking,
            at,
            "Booking created",
            "Your booking has been created successfully.",
            "A new booking has been created for your appointment type.",
        )
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
    at = db.get(AppointmentType, b.appointment_type_id)
    if at:
        _send_booking_email(
            db,
            b,
            at,
            "Booking cancelled",
            "Your booking has been cancelled.",
            "A booking has been cancelled.",
        )
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
        _send_booking_email(
            db,
            b,
            at,
            "Booking rescheduled",
            "Your booking was rescheduled successfully.",
            "A booking was rescheduled.",
        )
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
    _send_booking_email(
        db,
        b,
        at,
        "Booking confirmed",
        "Your booking has been confirmed.",
        "You confirmed a booking.",
    )
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
    _send_booking_email(
        db,
        b,
        at,
        "Booking completed",
        "Your booking has been marked as completed.",
        "You marked a booking as completed.",
    )
    return b
