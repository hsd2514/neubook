"""Compute available booking slots from weekly schedules minus existing bookings."""

from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.appointment_type import AppointmentType
from app.models.booking import Booking
from app.models.resource import Resource
from app.models.schedule import Schedule


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

    tz = ZoneInfo(tz_name)
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
        Booking.status.in_(["pending", "confirmed"]),
        Booking.start_time < end_utc,
        Booking.end_time > start_utc,
    )
    if resource_id is not None:
        bookings_q = bookings_q.where(Booking.resource_id == resource_id)
    bookings = db.execute(bookings_q).scalars().all()

    def _overlap_usage(slot_start: datetime, slot_end: datetime, res_id: int | None) -> int:
        """Sum capacity of bookings whose interval overlaps [slot_start, slot_end)."""
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
        dow = d.weekday()  # Mon=0
        day_slots: list[dict] = []

        def add_slots_for_resource(res: Resource | None, res_id: int | None):
            for sch in schedules:
                if sch.day_of_week != dow:
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
                    used = _overlap_usage(slot_start, slot_end, res_id)
                    avail = max(0, max_per_slot - used)
                    if avail > 0:
                        day_slots.append(
                            {
                                "start": slot_start,
                                "end": slot_end,
                                "available_capacity": avail,
                                "resource_id": res_id,
                            }
                        )
                    cur += duration

        if at.appointment_kind == "resource":
            for res in resources:
                add_slots_for_resource(res, res.id)
        else:
            add_slots_for_resource(None, None)

        day_slots.sort(key=lambda x: x["start"])
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
