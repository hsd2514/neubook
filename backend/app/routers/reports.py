from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import desc, func, select

from app.deps import DBSession, require_roles
from app.models.appointment_type import AppointmentType
from app.models.booking import Booking
from app.models.user import User
from app.services.booking_status import PENDING, REPORTABLE_BOOKING_STATUSES

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/admin-summary")
def admin_summary(db: DBSession, user: Annotated[User, Depends(require_roles("admin"))]):
    total_users = db.execute(select(func.count()).select_from(User)).scalar_one()
    total_providers = db.execute(
        select(func.count()).select_from(User).where(User.role == "organiser")
    ).scalar_one()
    total_appointments = db.execute(select(func.count()).select_from(Booking)).scalar_one()
    return {
        "total_users": int(total_users),
        "total_service_providers": int(total_providers),
        "total_appointments": int(total_appointments),
    }


@router.get("/admin-insights")
def admin_insights(db: DBSession, user: Annotated[User, Depends(require_roles("admin"))]):
    now = datetime.now(timezone.utc)
    start_window = now - timedelta(days=6)
    start_day = start_window.replace(hour=0, minute=0, second=0, microsecond=0)

    rows = db.execute(
        select(Booking.created_at, Booking.status).where(Booking.created_at >= start_day)
    ).all()

    trend_map: dict[str, int] = {}
    for offset in range(7):
        d = (start_day + timedelta(days=offset)).date().isoformat()
        trend_map[d] = 0

    status_counter: Counter[str] = Counter()
    for created_at, status in rows:
        day_key = created_at.astimezone(timezone.utc).date().isoformat()
        if day_key in trend_map:
            trend_map[day_key] += 1
        status_counter[status] += 1

    top_organisers_rows = db.execute(
        select(User.full_name, func.count(Booking.id).label("booking_count"))
        .select_from(Booking)
        .join(AppointmentType, AppointmentType.id == Booking.appointment_type_id)
        .join(User, User.id == AppointmentType.organiser_id)
        .group_by(User.id, User.full_name)
        .order_by(desc("booking_count"))
        .limit(5)
    ).all()

    return {
        "bookings_last_7_days": [{"date": k, "count": v} for k, v in trend_map.items()],
        "status_breakdown": {
            "pending": int(status_counter.get("pending", 0)),
            "confirmed": int(status_counter.get("confirmed", 0)),
            "completed": int(status_counter.get("completed", 0)),
            "cancelled": int(status_counter.get("cancelled", 0)),
        },
        "top_organisers": [
            {"name": name, "bookings": int(booking_count)} for name, booking_count in top_organisers_rows
        ],
    }


@router.get("/organiser-summary")
def organiser_summary(db: DBSession, user: Annotated[User, Depends(require_roles("organiser", "admin"))]):
    now = datetime.now(timezone.utc)
    start_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end_day = start_day + timedelta(days=1)

    type_ids = list(db.execute(select(AppointmentType.id).where(AppointmentType.organiser_id == user.id)).scalars().all())
    if not type_ids:
        return {
            "total_bookings": 0,
            "today_appointments": 0,
            "pending_confirmations": 0,
        }

    total_bookings = db.execute(
        select(func.count())
        .select_from(Booking)
        .where(
            Booking.appointment_type_id.in_(type_ids),
            Booking.status.in_(REPORTABLE_BOOKING_STATUSES),
        )
    ).scalar_one()
    today = db.execute(
        select(func.count())
        .select_from(Booking)
        .where(
            Booking.appointment_type_id.in_(type_ids),
            Booking.start_time >= start_day,
            Booking.start_time < end_day,
            Booking.status.in_(REPORTABLE_BOOKING_STATUSES),
        )
    ).scalar_one()
    pending = db.execute(
        select(func.count())
        .select_from(Booking)
        .where(Booking.appointment_type_id.in_(type_ids), Booking.status == PENDING)
    ).scalar_one()

    return {
        "total_bookings": int(total_bookings),
        "today_appointments": int(today),
        "pending_confirmations": int(pending),
    }


@router.get("/insights")
def insights(db: DBSession, user: Annotated[User, Depends(require_roles("organiser", "admin"))]):
    type_ids = list(db.execute(select(AppointmentType.id).where(AppointmentType.organiser_id == user.id)).scalars().all())
    if not type_ids:
        return {"peak_hours": [], "provider_utilization": []}

    bookings = db.execute(
        select(Booking).where(
            Booking.appointment_type_id.in_(type_ids),
            Booking.status.in_(REPORTABLE_BOOKING_STATUSES),
        )
    ).scalars().all()

    hour_counter: Counter[int] = Counter()
    for b in bookings:
        hour_counter[b.start_time.astimezone(timezone.utc).hour] += 1
    peak_hours = [{"hour": h, "count": c} for h, c in sorted(hour_counter.items())]

    res_counter: Counter[int | None] = Counter()
    for b in bookings:
        res_counter[b.resource_id] += 1
    provider_utilization = [{"resource_id": k, "bookings": v} for k, v in res_counter.items()]

    return {"peak_hours": peak_hours, "provider_utilization": provider_utilization}
