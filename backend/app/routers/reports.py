from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func, select, case, and_

from app.deps import DBSession, require_roles
from app.models.appointment_type import AppointmentType
from app.models.booking import Booking
from app.models.booking_seat import BookingSeat
from app.models.resource import Resource
from app.models.user import User
from app.services.booking_status import (
    CANCELLED,
    COMPLETED,
    CONFIRMED,
    PENDING,
    REPORTABLE_BOOKING_STATUSES,
)

router = APIRouter(prefix="/reports", tags=["reports"])


def _organiser_type_ids(db, user_id: int) -> list[int]:
    return list(
        db.execute(
            select(AppointmentType.id).where(AppointmentType.organiser_id == user_id)
        )
        .scalars()
        .all()
    )


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

    type_ids = _organiser_type_ids(db, user.id)
    if not type_ids:
        return {
            "total_bookings": 0,
            "today_appointments": 0,
            "pending_confirmations": 0,
            "confirmed_bookings": 0,
            "completed_bookings": 0,
            "cancelled_bookings": 0,
            "total_revenue_paisa": 0,
            "upcoming_this_week": 0,
        }

    base = Booking.appointment_type_id.in_(type_ids)

    total_bookings = db.execute(
        select(func.count()).select_from(Booking).where(base, Booking.status.in_(REPORTABLE_BOOKING_STATUSES))
    ).scalar_one()
    today = db.execute(
        select(func.count()).select_from(Booking).where(
            base, Booking.start_time >= start_day, Booking.start_time < end_day,
            Booking.status.in_(REPORTABLE_BOOKING_STATUSES),
        )
    ).scalar_one()
    pending = db.execute(
        select(func.count()).select_from(Booking).where(base, Booking.status == PENDING)
    ).scalar_one()
    confirmed = db.execute(
        select(func.count()).select_from(Booking).where(base, Booking.status == CONFIRMED)
    ).scalar_one()
    completed = db.execute(
        select(func.count()).select_from(Booking).where(base, Booking.status == COMPLETED)
    ).scalar_one()
    cancelled = db.execute(
        select(func.count()).select_from(Booking).where(base, Booking.status == CANCELLED)
    ).scalar_one()

    week_end = start_day + timedelta(days=7)
    upcoming_week = db.execute(
        select(func.count()).select_from(Booking).where(
            base, Booking.start_time >= now, Booking.start_time < week_end,
            Booking.status.in_(REPORTABLE_BOOKING_STATUSES),
        )
    ).scalar_one()

    revenue = db.execute(
        select(func.coalesce(func.sum(AppointmentType.service_amount_paisa * Booking.capacity), 0))
        .select_from(Booking)
        .join(AppointmentType, AppointmentType.id == Booking.appointment_type_id)
        .where(base, Booking.payment_status == "paid")
    ).scalar_one()

    return {
        "total_bookings": int(total_bookings),
        "today_appointments": int(today),
        "pending_confirmations": int(pending),
        "confirmed_bookings": int(confirmed),
        "completed_bookings": int(completed),
        "cancelled_bookings": int(cancelled),
        "total_revenue_paisa": int(revenue),
        "upcoming_this_week": int(upcoming_week),
    }


@router.get("/insights")
def insights(db: DBSession, user: Annotated[User, Depends(require_roles("organiser", "admin"))]):
    type_ids = _organiser_type_ids(db, user.id)
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


@router.get("/organiser-detailed")
def organiser_detailed(
    db: DBSession,
    user: Annotated[User, Depends(require_roles("organiser", "admin"))],
    days: int = Query(30, ge=1, le=365),
):
    type_ids = _organiser_type_ids(db, user.id)
    if not type_ids:
        return {
            "booking_trend": [],
            "status_breakdown": {"pending": 0, "confirmed": 0, "completed": 0, "cancelled": 0},
            "per_appointment": [],
            "per_resource": [],
            "peak_hours": [],
            "peak_days": [],
            "cancellation_rate": 0,
            "avg_capacity": 0,
            "revenue_trend": [],
            "total_revenue_paisa": 0,
            "seat_utilization": [],
            "recent_bookings": [],
        }

    now = datetime.now(timezone.utc)
    window_start = (now - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    base = Booking.appointment_type_id.in_(type_ids)

    all_bookings = db.execute(
        select(
            Booking.id,
            Booking.appointment_type_id,
            Booking.resource_id,
            Booking.start_time,
            Booking.end_time,
            Booking.capacity,
            Booking.status,
            Booking.payment_status,
            Booking.created_at,
        ).where(base)
    ).all()

    # --- Booking trend (daily counts, last N days) ---
    trend_map: dict[str, dict[str, int]] = {}
    for offset in range(days):
        d = (window_start + timedelta(days=offset)).date().isoformat()
        trend_map[d] = {"total": 0, "confirmed": 0, "cancelled": 0}

    status_counter: Counter[str] = Counter()
    hour_counter: Counter[int] = Counter()
    day_counter: Counter[int] = Counter()
    appt_counter: Counter[int] = Counter()
    appt_revenue: Counter[int] = Counter()
    res_counter: Counter[int | None] = Counter()
    total_capacity = 0
    reportable_count = 0
    all_count = len(all_bookings)
    cancel_count = 0

    at_map: dict[int, AppointmentType] = {}
    for tid in type_ids:
        at_obj = db.get(AppointmentType, tid)
        if at_obj:
            at_map[tid] = at_obj

    res_map: dict[int, str] = {}
    for at_obj in at_map.values():
        for r in at_obj.resources or []:
            res_map[r.id] = r.name

    for b_id, at_id, rid, start, end, cap, status, pay_status, created in all_bookings:
        status_counter[status] += 1
        if status == CANCELLED:
            cancel_count += 1
        if status in REPORTABLE_BOOKING_STATUSES:
            reportable_count += 1
            total_capacity += cap
            h = start.astimezone(timezone.utc).hour
            hour_counter[h] += 1
            dow = start.astimezone(timezone.utc).weekday()
            day_counter[dow] += 1
            appt_counter[at_id] += 1
            res_counter[rid] += 1

        if created:
            day_key = created.astimezone(timezone.utc).date().isoformat()
            if day_key in trend_map:
                trend_map[day_key]["total"] += 1
                if status == CONFIRMED or status == COMPLETED:
                    trend_map[day_key]["confirmed"] += 1
                elif status == CANCELLED:
                    trend_map[day_key]["cancelled"] += 1

        if pay_status == "paid":
            at_obj = at_map.get(at_id)
            if at_obj:
                appt_revenue[at_id] += at_obj.service_amount_paisa * cap

    booking_trend = [
        {"date": k, "total": v["total"], "confirmed": v["confirmed"], "cancelled": v["cancelled"]}
        for k, v in trend_map.items()
    ]

    # --- Revenue trend (last N days) ---
    rev_bookings = db.execute(
        select(Booking.created_at, Booking.capacity, AppointmentType.service_amount_paisa)
        .select_from(Booking)
        .join(AppointmentType, AppointmentType.id == Booking.appointment_type_id)
        .where(base, Booking.payment_status == "paid", Booking.created_at >= window_start)
    ).all()

    rev_trend_map: dict[str, int] = {}
    for offset in range(days):
        d = (window_start + timedelta(days=offset)).date().isoformat()
        rev_trend_map[d] = 0
    for created, cap, amount in rev_bookings:
        if created:
            dk = created.astimezone(timezone.utc).date().isoformat()
            if dk in rev_trend_map:
                rev_trend_map[dk] += amount * cap

    revenue_trend = [{"date": k, "revenue_paisa": v} for k, v in rev_trend_map.items()]

    # --- Per-appointment breakdown ---
    per_appointment = []
    for tid, count in appt_counter.most_common():
        at_obj = at_map.get(tid)
        per_appointment.append({
            "appointment_type_id": tid,
            "name": at_obj.name if at_obj else f"#{tid}",
            "booking_mode": at_obj.booking_mode if at_obj else "capacity",
            "total_bookings": count,
            "revenue_paisa": int(appt_revenue.get(tid, 0)),
        })

    # --- Per-resource breakdown ---
    per_resource = []
    for rid, count in res_counter.most_common():
        per_resource.append({
            "resource_id": rid,
            "resource_name": res_map.get(rid, "Unassigned") if rid else "Unassigned",
            "total_bookings": count,
        })

    # --- Peak hours ---
    peak_hours = [{"hour": h, "count": c} for h, c in sorted(hour_counter.items())]

    # --- Peak days of week ---
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    peak_days = [{"day": day_names[d], "day_index": d, "count": day_counter.get(d, 0)} for d in range(7)]

    # --- Cancellation rate ---
    cancellation_rate = round((cancel_count / all_count * 100) if all_count > 0 else 0, 1)

    # --- Avg capacity ---
    avg_capacity = round(total_capacity / reportable_count, 1) if reportable_count > 0 else 0

    # --- Seat utilization (for seat_map appointments) ---
    seat_util = []
    seat_map_type_ids = [tid for tid, at_obj in at_map.items() if at_obj.booking_mode == "seat_map"]
    if seat_map_type_ids:
        from app.models.seat import Seat
        for tid in seat_map_type_ids:
            at_obj = at_map[tid]
            total_seats = db.execute(
                select(func.count()).select_from(Seat).where(
                    Seat.appointment_type_id == tid, Seat.status == "active"
                )
            ).scalar_one()
            booked_seat_count = db.execute(
                select(func.count(func.distinct(BookingSeat.seat_id)))
                .select_from(BookingSeat)
                .join(Booking, Booking.id == BookingSeat.booking_id)
                .where(
                    Booking.appointment_type_id == tid,
                    Booking.status.in_(REPORTABLE_BOOKING_STATUSES),
                    Booking.start_time >= window_start,
                )
            ).scalar_one()
            seat_util.append({
                "appointment_type_id": tid,
                "name": at_obj.name,
                "total_seats": int(total_seats),
                "booked_seats": int(booked_seat_count),
                "utilization_pct": round(booked_seat_count / total_seats * 100, 1) if total_seats > 0 else 0,
            })

    # --- Recent bookings (last 10) ---
    recent = db.execute(
        select(
            Booking.id,
            Booking.appointment_type_id,
            Booking.customer_id,
            Booking.start_time,
            Booking.capacity,
            Booking.status,
            Booking.created_at,
        )
        .where(base)
        .order_by(Booking.created_at.desc())
        .limit(10)
    ).all()

    customer_ids = list({r[2] for r in recent})
    customers: dict[int, str] = {}
    if customer_ids:
        crows = db.execute(
            select(User.id, User.full_name).where(User.id.in_(customer_ids))
        ).all()
        customers = {uid: name for uid, name in crows}

    recent_bookings = []
    for b_id, at_id, cust_id, start, cap, status, created in recent:
        at_obj = at_map.get(at_id)
        recent_bookings.append({
            "id": b_id,
            "appointment_name": at_obj.name if at_obj else f"#{at_id}",
            "customer_name": customers.get(cust_id, f"User #{cust_id}"),
            "start_time": start.isoformat(),
            "capacity": cap,
            "status": status,
            "created_at": created.isoformat() if created else None,
        })

    total_revenue = sum(appt_revenue.values())

    return {
        "booking_trend": booking_trend,
        "status_breakdown": {
            "pending": int(status_counter.get(PENDING, 0)),
            "confirmed": int(status_counter.get(CONFIRMED, 0)),
            "completed": int(status_counter.get(COMPLETED, 0)),
            "cancelled": int(status_counter.get(CANCELLED, 0)),
        },
        "per_appointment": per_appointment,
        "per_resource": per_resource,
        "peak_hours": peak_hours,
        "peak_days": peak_days,
        "cancellation_rate": cancellation_rate,
        "avg_capacity": avg_capacity,
        "revenue_trend": revenue_trend,
        "total_revenue_paisa": int(total_revenue),
        "seat_utilization": seat_util,
        "recent_bookings": recent_bookings,
    }
