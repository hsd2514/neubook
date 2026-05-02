"""Compute available booking slots from weekly schedules minus existing bookings."""

from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.appointment_type import AppointmentType
from app.models.booking import Booking
from app.models.resource import Resource
from app.models.schedule import Schedule
from app.services.booking_status import ACTIVE_SLOT_STATUSES


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

    try:
        tz = ZoneInfo(tz_name)
    except ZoneInfoNotFoundError:
        tz = timezone.utc
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

    if not resources and at.appointment_kind == "resource":
        return []

    if at.appointment_kind == "resource" and not resources:
        return []

    # Bookings overlapping range
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

    def slot_usage_key(start: datetime, res_id: int | None) -> tuple:
        return (start.astimezone(timezone.utc).replace(tzinfo=timezone.utc), res_id)

    usage: dict[tuple, int] = defaultdict(int)
    for b in bookings:
        key = slot_usage_key(b.start_time, b.resource_id)
        usage[key] += b.capacity

    days_out: list[dict] = []
    d = from_date
    while d <= to_date:
        dow = d.weekday()  # Mon=0
        day_slots_map: dict[tuple, dict] = {}

        def add_slots_for_resource(res: Resource | None, res_id: int | None):
            for sch in schedules:
                mode = sch.schedule_mode or "weekly"
                if mode == "weekly":
                    if sch.day_of_week != dow:
                        continue
                elif mode == "flexible":
                    if sch.slot_date != d:
                        continue
                else:
                    continue
                if sch.resource_id is not None and res_id is not None and sch.resource_id != res_id:
                    continue
                if sch.resource_id is not None and res_id is None:
                    continue
                st = sch.start_time
                et = sch.end_time
                cur = datetime.combine(d, st, tzinfo=tz)
                end = datetime.combine(d, et, tzinfo=tz)
                while cur + duration <= end:
                    slot_start = cur
                    slot_end = cur + duration
                    used = usage.get(
                        (slot_start.astimezone(timezone.utc).replace(tzinfo=timezone.utc), res_id),
                        0,
                    )
                    avail = max(0, max_per_slot - used)
                    if avail > 0:
                        key = (slot_start.astimezone(timezone.utc).replace(tzinfo=timezone.utc), res_id)
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
                add_slots_for_resource(res, res.id)
        else:
            add_slots_for_resource(None, None)

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
