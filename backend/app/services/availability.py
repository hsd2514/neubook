"""Compute available booking slots from weekly/flexible schedules minus existing bookings."""

from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.appointment_type import AppointmentType
from app.models.blocked_slot import BlockedSlot
from app.models.booking import Booking
from app.models.resource import Resource
from app.models.schedule import Schedule
from app.services.booking_status import ACTIVE_SLOT_STATUSES


def _resolve_tz(tz_name: str):
    if tz_name.upper() in ("UTC", "Z"):
        return timezone.utc
    try:
        return ZoneInfo(tz_name)
    except ZoneInfoNotFoundError as exc:
        raise ValueError(f"Invalid timezone: {tz_name}") from exc


def _schedule_matches_day(sch: Schedule, target_day: date, target_dow: int) -> bool:
    mode = sch.schedule_mode or "weekly"
    if mode == "weekly":
        return sch.day_of_week == target_dow
    if mode == "flexible":
        return sch.slot_date == target_day
    return False


def _block_matches_day(block: BlockedSlot, target_day: date, target_dow: int) -> bool:
    if target_day < block.start_date or target_day > block.end_date:
        return False
    if block.block_type == "recurring":
        return block.day_of_week == target_dow
    return True


def _is_slot_blocked(
    blocked_slots: list[BlockedSlot],
    slot_start: datetime,
    slot_end: datetime,
    res_id: int | None,
) -> bool:
    day = slot_start.date()
    dow = day.weekday()
    slot_start_t = slot_start.timetz().replace(tzinfo=None)
    slot_end_t = slot_end.timetz().replace(tzinfo=None)

    for block in blocked_slots:
        if block.resource_id is not None and block.resource_id != res_id:
            continue
        if not _block_matches_day(block, day, dow):
            continue
        if block.start_time is None or block.end_time is None:
            return True
        if block.start_time < slot_end_t and block.end_time > slot_start_t:
            return True
    return False


def get_availability(
    db: Session,
    appointment_type_id: int,
    resource_id: int | None,
    from_date: date,
    to_date: date,
    tz_name: str = "UTC",
) -> list[dict]:
    at = db.get(AppointmentType, appointment_type_id)
    if not at:
        raise ValueError("Appointment type not found")

    tz = _resolve_tz(tz_name)
    duration = timedelta(minutes=at.duration_minutes)
    max_per_slot = at.max_bookings_per_slot

    schedules = db.execute(
        select(Schedule).where(Schedule.appointment_type_id == appointment_type_id)
    ).scalars().all()

    if resource_id is not None:
        schedules = [s for s in schedules if s.resource_id is None or s.resource_id == resource_id]

    resources: list[Resource] = []
    if resource_id is not None:
        r = db.get(Resource, resource_id)
        if r and r.appointment_type_id == appointment_type_id:
            resources = [r]
    else:
        resources = list(
            db.execute(select(Resource).where(Resource.appointment_type_id == appointment_type_id)).scalars().all()
        )

    if at.appointment_kind == "resource" and not resources:
        return []

    blocked_slots = db.execute(
        select(BlockedSlot).where(
            BlockedSlot.appointment_type_id == appointment_type_id,
            BlockedSlot.end_date >= from_date,
            BlockedSlot.start_date <= to_date,
        )
    ).scalars().all()

    start_utc = datetime.combine(from_date, time.min, tzinfo=tz).astimezone(timezone.utc)
    end_utc = datetime.combine(to_date + timedelta(days=1), time.min, tzinfo=tz).astimezone(timezone.utc)

    bookings_q = select(Booking).where(
        Booking.appointment_type_id == appointment_type_id,
        Booking.status.in_(ACTIVE_SLOT_STATUSES),
        Booking.start_time < end_utc,
        Booking.end_time > start_utc,
    )
    if resource_id is not None:
        bookings_q = bookings_q.where(Booking.resource_id == resource_id)
    bookings = db.execute(bookings_q).scalars().all()

    def _overlap_usage(slot_start: datetime, slot_end: datetime, res_id: int | None) -> int:
        total = 0
        ss_utc = slot_start.astimezone(timezone.utc)
        se_utc = slot_end.astimezone(timezone.utc)
        for b in bookings:
            if res_id is not None and b.resource_id != res_id:
                continue
            b_start = b.start_time if b.start_time.tzinfo else b.start_time.replace(tzinfo=timezone.utc)
            b_end = b.end_time if b.end_time.tzinfo else b.end_time.replace(tzinfo=timezone.utc)
            if b_start < se_utc and b_end > ss_utc:
                total += b.capacity
        return total

    days_out: list[dict] = []
    d = from_date
    while d <= to_date:
        dow = d.weekday()
        day_slots_map: dict[tuple, dict] = {}

        def add_slots_for_resource(res_id: int | None):
            for sch in schedules:
                if not _schedule_matches_day(sch, d, dow):
                    continue
                if sch.resource_id is not None and res_id is not None and sch.resource_id != res_id:
                    continue
                if sch.resource_id is not None and res_id is None:
                    continue

                cur = datetime.combine(d, sch.start_time, tzinfo=tz)
                end = datetime.combine(d, sch.end_time, tzinfo=tz)
                if end <= cur:
                    end += timedelta(days=1)
                while cur + duration <= end:
                    slot_start = cur
                    slot_end = cur + duration
                    if _is_slot_blocked(blocked_slots, slot_start, slot_end, res_id):
                        cur += duration
                        continue
                    used = _overlap_usage(slot_start, slot_end, res_id)
                    avail = max(0, max_per_slot - used)
                    # Include both available AND full (avail=0) slots so customer can join waitlist
                    key = (slot_start.astimezone(timezone.utc).replace(second=0, microsecond=0), res_id)
                    if key not in day_slots_map:
                        day_slots_map[key] = {
                            "start": slot_start,
                            "end": slot_end,
                            "available_capacity": avail,
                            "resource_id": res_id,
                        }
                    cur += duration

        if at.appointment_kind == "resource":
            for res in resources:
                add_slots_for_resource(res.id)
        else:
            add_slots_for_resource(None)

        day_slots = sorted(day_slots_map.values(), key=lambda x: x["start"])
        if day_slots:
            days_out.append(
                {
                    "date": d.isoformat(),
                    "slots": [
                        {
                            "start": s["start"],
                            "end": s["end"],
                            "available_capacity": s["available_capacity"],
                            "resource_id": s.get("resource_id"),
                        }
                        for s in day_slots
                    ],
                }
            )
        d += timedelta(days=1)

    return days_out


def slot_exists_for_start(
    db: Session,
    appointment_type_id: int,
    resource_id: int | None,
    start_time: datetime,
    tz_name: str = "UTC",
) -> bool:
    """Return True when start_time aligns to at least one configured schedule slot."""
    if start_time.tzinfo is None:
        return False

    at = db.get(AppointmentType, appointment_type_id)
    if not at:
        return False

    tz = _resolve_tz(tz_name)
    local_start = start_time.astimezone(tz).replace(second=0, microsecond=0)
    local_day = local_start.date()
    local_dow = local_day.weekday()
    duration = timedelta(minutes=at.duration_minutes)

    schedules = db.execute(
        select(Schedule).where(Schedule.appointment_type_id == appointment_type_id)
    ).scalars().all()

    if resource_id is not None:
        schedules = [s for s in schedules if s.resource_id is None or s.resource_id == resource_id]
    elif at.appointment_kind == "resource":
        schedules = [s for s in schedules if s.resource_id is None]

    for sch in schedules:
        if not _schedule_matches_day(sch, local_day, local_dow):
            continue
        window_start = datetime.combine(local_day, sch.start_time, tzinfo=tz)
        window_end = datetime.combine(local_day, sch.end_time, tzinfo=tz)
        if window_end <= window_start:
            window_end += timedelta(days=1)
        if local_start < window_start or local_start + duration > window_end:
            continue
        delta = local_start - window_start
        if delta % duration != timedelta(0):
            continue
        blocked_slots = db.execute(
            select(BlockedSlot).where(
                BlockedSlot.appointment_type_id == appointment_type_id,
                BlockedSlot.end_date >= local_day,
                BlockedSlot.start_date <= local_day,
            )
        ).scalars().all()
        if _is_slot_blocked(blocked_slots, local_start, local_start + duration, resource_id):
            continue
        if delta % duration == timedelta(0):
            return True
    return False


def auto_assign_resource(
    db: Session,
    appointment_type_id: int,
    start_time: datetime,
    capacity: int,
) -> int:
    """Pick a resource that can accept the requested booking window."""
    at = db.get(AppointmentType, appointment_type_id)
    if not at:
        raise ValueError("Appointment type not found")

    resources = list(
        db.execute(
            select(Resource).where(Resource.appointment_type_id == appointment_type_id)
        ).scalars().all()
    )
    if not resources:
        raise ValueError("No resources available")

    end_time = start_time + timedelta(minutes=at.duration_minutes)
    best_id: int | None = None
    best_used: int | None = None
    for res in resources:
        if not slot_exists_for_start(db, appointment_type_id, res.id, start_time, tz_name="UTC"):
            continue
        used = db.execute(
            select(func.coalesce(func.sum(Booking.capacity), 0)).where(
                Booking.appointment_type_id == appointment_type_id,
                Booking.resource_id == res.id,
                Booking.status.in_(ACTIVE_SLOT_STATUSES),
                Booking.start_time < end_time,
                Booking.end_time > start_time,
            )
        ).scalar_one()
        used = int(used)
        avail = at.max_bookings_per_slot - used
        if avail >= capacity and (best_used is None or used < best_used):
            best_id = res.id
            best_used = used

    if best_id is None:
        raise ValueError("No resource available for the requested slot")
    return best_id
