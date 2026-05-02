from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from app.deps import CurrentUser, DBSession, require_roles
from app.models.appointment_type import AppointmentType
from app.models.booking import Booking
from app.models.user import User
from app.schemas.booking import BookingCreate, BookingOut, BookingReschedule
from app.services import booking_service

router = APIRouter(prefix="/bookings", tags=["bookings"])


def _out(b: Booking) -> BookingOut:
    return BookingOut.model_validate(b)


@router.post("", response_model=BookingOut)
def create_booking_route(data: BookingCreate, db: DBSession, user: CurrentUser):
    if user.role not in ("customer", "admin"):
        raise HTTPException(status_code=403, detail="Customers only")
    try:
        b = booking_service.create_booking(
            db,
            user.id,
            data.appointment_type_id,
            data.resource_id,
            data.start_time,
            data.capacity,
            data.answers,
            data.payment_confirmed,
            data.payment_reference,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return _out(b)


@router.get("/mine", response_model=list[BookingOut])
def my_bookings(db: DBSession, user: CurrentUser):
    rows = (
        db.execute(select(Booking).where(Booking.customer_id == user.id).order_by(Booking.start_time.desc()))
        .scalars()
        .all()
    )
    return [_out(b) for b in rows]


@router.get("/organiser", response_model=list[BookingOut])
def organiser_bookings(
    db: DBSession,
    user: Annotated[User, Depends(require_roles("organiser", "admin"))],
    status_filter: str | None = None,
):
    q = (
        select(Booking)
        .join(AppointmentType, Booking.appointment_type_id == AppointmentType.id)
        .where(AppointmentType.organiser_id == user.id)
        .order_by(Booking.start_time.desc())
    )
    if status_filter:
        q = q.where(Booking.status == status_filter)
    rows = db.execute(q).scalars().all()
    return [_out(b) for b in rows]


@router.post("/{booking_id}/cancel", response_model=BookingOut)
def cancel(booking_id: int, db: DBSession, user: CurrentUser):
    try:
        b = booking_service.cancel_booking(db, booking_id, user.id, user.role)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return _out(b)


@router.post("/{booking_id}/reschedule", response_model=BookingOut)
def reschedule(booking_id: int, data: BookingReschedule, db: DBSession, user: CurrentUser):
    try:
        b = booking_service.reschedule_booking(db, booking_id, user.id, data.start_time)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return _out(b)


@router.post("/{booking_id}/confirm", response_model=BookingOut)
def confirm(
    booking_id: int,
    db: DBSession,
    user: Annotated[User, Depends(require_roles("organiser", "admin"))],
):
    try:
        b = booking_service.organiser_confirm(db, booking_id, user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return _out(b)
