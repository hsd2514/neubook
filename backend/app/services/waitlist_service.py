"""Waitlist service — join, leave, promote-on-cancellation."""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.appointment_type import AppointmentType
from app.models.booking import Booking
from app.models.waitlist import WaitlistEntry
from app.services.booking_status import ACTIVE_SLOT_STATUSES
from app.services.email_service import send_email
from app.models.user import User


# ──────────────────────────────────────────────────────────────────────────────
# helpers
# ──────────────────────────────────────────────────────────────────────────────

def _normalize_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        raise ValueError("start_time must include timezone")
    return dt.astimezone(timezone.utc).replace(second=0, microsecond=0)


def _active_entries_for_slot(
    db: Session,
    appointment_type_id: int,
    resource_id: Optional[int],
    start_time: datetime,
) -> list[WaitlistEntry]:
    q = (
        select(WaitlistEntry)
        .where(
            WaitlistEntry.appointment_type_id == appointment_type_id,
            WaitlistEntry.resource_id == resource_id,
            WaitlistEntry.start_time == start_time,
            WaitlistEntry.status == "waiting",
        )
        .order_by(WaitlistEntry.position.asc())
    )
    return db.execute(q).scalars().all()


# ──────────────────────────────────────────────────────────────────────────────
# public API
# ──────────────────────────────────────────────────────────────────────────────

def join_waitlist(
    db: Session,
    customer_id: int,
    appointment_type_id: int,
    resource_id: Optional[int],
    start_time: datetime,
    seat_ids: Optional[list[int]],
    answers: Optional[dict | list],
) -> WaitlistEntry:
    start_time = _normalize_utc(start_time)

    at = db.get(AppointmentType, appointment_type_id)
    if not at:
        raise ValueError("Appointment type not found")

    # Prevent duplicate waitlist for same customer + slot
    existing = db.execute(
        select(WaitlistEntry).where(
            WaitlistEntry.customer_id == customer_id,
            WaitlistEntry.appointment_type_id == appointment_type_id,
            WaitlistEntry.resource_id == resource_id,
            WaitlistEntry.start_time == start_time,
            WaitlistEntry.status == "waiting",
        )
    ).scalar_one_or_none()

    if existing:
        raise ValueError("Already on the waitlist for this slot")

    # Determine queue position (1-based)
    max_pos = db.execute(
        select(func.coalesce(func.max(WaitlistEntry.position), 0)).where(
            WaitlistEntry.appointment_type_id == appointment_type_id,
            WaitlistEntry.resource_id == resource_id,
            WaitlistEntry.start_time == start_time,
            WaitlistEntry.status == "waiting",
        )
    ).scalar_one()

    entry = WaitlistEntry(
        customer_id=customer_id,
        appointment_type_id=appointment_type_id,
        resource_id=resource_id,
        start_time=start_time,
        seat_ids=seat_ids,
        answers=answers,
        position=int(max_pos) + 1,
        status="waiting",
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    # Notify customer
    customer = db.get(User, customer_id)
    if customer:
        when = start_time.strftime("%Y-%m-%d %H:%M UTC")
        send_email(
            customer.email,
            "You've been added to the waitlist",
            (
                f"Hi {customer.full_name},\n\n"
                f"You are now #{entry.position} in the waitlist for:\n"
                f"  Service: {at.name}\n"
                f"  Time:    {when}\n\n"
                "We will notify you if a spot becomes available."
            ),
        )
    return entry


def leave_waitlist(db: Session, entry_id: int, customer_id: int) -> WaitlistEntry:
    entry = db.get(WaitlistEntry, entry_id)
    if not entry or entry.customer_id != customer_id:
        raise ValueError("Waitlist entry not found")
    if entry.status == "cancelled":
        return entry
    entry.status = "cancelled"
    db.commit()
    db.refresh(entry)
    return entry


def get_slot_waitlist_count(
    db: Session,
    appointment_type_id: int,
    resource_id: Optional[int],
    start_time: datetime,
) -> int:
    """Return the number of active waitlist entries for a slot."""
    count = db.execute(
        select(func.count(WaitlistEntry.id)).where(
            WaitlistEntry.appointment_type_id == appointment_type_id,
            WaitlistEntry.resource_id == resource_id,
            WaitlistEntry.start_time == start_time,
            WaitlistEntry.status == "waiting",
        )
    ).scalar_one()
    return int(count)


def get_seat_waitlist_entries(
    db: Session,
    appointment_type_id: int,
    start_time: datetime,
) -> list[WaitlistEntry]:
    """Return all active waitlist entries for a seat-map appointment+slot."""
    return db.execute(
        select(WaitlistEntry).where(
            WaitlistEntry.appointment_type_id == appointment_type_id,
            WaitlistEntry.start_time == start_time,
            WaitlistEntry.status == "waiting",
        )
    ).scalars().all()


def promote_next_from_waitlist(
    db: Session,
    appointment_type_id: int,
    resource_id: Optional[int],
    start_time: datetime,
    freed_capacity: int = 1,
) -> list[WaitlistEntry]:
    """
    Called after a booking cancellation.  Notifies the first N entries whose
    requested capacity (seat_ids count or 1) can now be satisfied.
    Returns the list of promoted entries.
    """
    at = db.get(AppointmentType, appointment_type_id)
    if not at:
        return []

    end_time = start_time + __import__("datetime").timedelta(minutes=at.duration_minutes)

    # How much is still free after the cancellation?
    used = db.execute(
        select(func.coalesce(func.sum(Booking.capacity), 0)).where(
            Booking.appointment_type_id == appointment_type_id,
            Booking.resource_id == resource_id,
            Booking.status.in_(ACTIVE_SLOT_STATUSES),
            Booking.start_time < end_time,
            Booking.end_time > start_time,
        )
    ).scalar_one()
    available = at.max_bookings_per_slot - int(used)

    if available <= 0:
        return []

    entries = _active_entries_for_slot(db, appointment_type_id, resource_id, start_time)
    promoted: list[WaitlistEntry] = []

    for entry in entries:
        needed = len(entry.seat_ids) if entry.seat_ids else 1
        if needed <= available:
            entry.status = "notified"
            available -= needed
            promoted.append(entry)
            # Email customer
            customer = db.get(User, entry.customer_id)
            if customer:
                when = start_time.strftime("%Y-%m-%d %H:%M UTC")
                send_email(
                    customer.email,
                    "A spot opened up — book now!",
                    (
                        f"Hi {customer.full_name},\n\n"
                        f"A spot has become available for:\n"
                        f"  Service: {at.name}\n"
                        f"  Time:    {when}\n\n"
                        "Please log in and complete your booking as soon as possible."
                    ),
                )
        if available <= 0:
            break

    if promoted:
        db.commit()
    return promoted
