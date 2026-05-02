from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select

from app.deps import DBSession, require_roles
from app.models.appointment_type import AppointmentType
from app.models.booking import Booking
from app.models.user import User

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
        select(func.count()).select_from(Booking).where(Booking.appointment_type_id.in_(type_ids))
    ).scalar_one()
    today = db.execute(
        select(func.count())
        .select_from(Booking)
        .where(
            Booking.appointment_type_id.in_(type_ids),
            Booking.start_time >= start_day,
            Booking.start_time < end_day,
            Booking.status.in_(["pending", "confirmed"]),
        )
    ).scalar_one()
    pending = db.execute(
        select(func.count())
        .select_from(Booking)
        .where(Booking.appointment_type_id.in_(type_ids), Booking.status == "pending")
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
            Booking.status.in_(["pending", "confirmed", "completed"]),
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
