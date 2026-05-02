from typing import Annotated
import logging

from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.deps import CurrentUser, DBSession, require_roles
from app.models.appointment_type import AppointmentType
from app.models.booking import Booking
from app.models.resource import Resource
from app.models.user import User
from app.schemas.booking import BookingCreate, BookingOut, BookingReschedule
from app.schemas.booking import (
    PhonePeCallbackValidateIn,
    PhonePePaymentInitiateIn,
    PhonePePaymentInitiateOut,
    PhonePePaymentStatusIn,
    PhonePePaymentStatusOut,
)
from app.services import booking_service
from app.services.idempotency import (
    ENDPOINT_BOOKING_CREATE,
    cleanup_expired,
    find_record,
    store_record,
)
from app.services.phonepe_service import (
    PhonePeNotConfiguredError,
    fetch_order_status,
    initiate_payment,
    validate_callback,
)

router = APIRouter(prefix="/bookings", tags=["bookings"])
logger = logging.getLogger(__name__)


def _out(b: Booking) -> BookingOut:
    data = {
        "id": b.id,
        "customer_id": b.customer_id,
        "customer_name": b.customer.full_name if b.customer else None,
        "appointment_type_id": b.appointment_type_id,
        "appointment_type_name": b.appointment_type.name if b.appointment_type else None,
        "resource_id": b.resource_id,
        "resource_name": b.resource.name if b.resource else None,
        "start_time": b.start_time,
        "end_time": b.end_time,
        "capacity": b.capacity,
        "status": b.status,
        "payment_status": b.payment_status,
        "payment_reference": b.payment_reference,
        "answers": b.answers,
        "seat_ids": [link.seat_id for link in (b.seat_links or [])],
        "created_at": b.created_at,
    }
    return BookingOut.model_validate(data)


@router.post("", response_model=BookingOut)
def create_booking_route(
    data: BookingCreate,
    db: DBSession,
    user: CurrentUser,
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
):
    if user.role not in ("customer", "admin"):
        raise HTTPException(status_code=403, detail="Customers only")

    if idempotency_key is not None:
        cleanup_expired(db)
        existing = find_record(db, idempotency_key, user.id, ENDPOINT_BOOKING_CREATE)
        if existing:
            return JSONResponse(
                status_code=existing.status_code,
                content=existing.response_body,
            )

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
            data.share_token,
            data.seat_ids,
        )
    except ValueError as e:
        if idempotency_key is not None:
            store_record(
                db, idempotency_key, user.id, ENDPOINT_BOOKING_CREATE,
                400, {"detail": str(e)},
            )
        raise HTTPException(status_code=400, detail=str(e))

    result = _out(b)
    if idempotency_key is not None:
        store_record(
            db, idempotency_key, user.id, ENDPOINT_BOOKING_CREATE,
            200, result.model_dump(mode="json"), booking_id=b.id,
        )
    return result


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
        .outerjoin(User, Booking.customer_id == User.id)
        .outerjoin(Resource, Booking.resource_id == Resource.id)
        .where(AppointmentType.organiser_id == user.id)
        .order_by(Booking.start_time.asc())
        .options(
            selectinload(Booking.appointment_type),
            selectinload(Booking.resource),
            selectinload(Booking.customer),
        )
    )
    if status_filter:
        q = q.where(Booking.status == status_filter)
    rows = db.execute(q).scalars().all()
    return [_out(b) for b in rows]


@router.get("/admin", response_model=list[BookingOut])
def admin_bookings(
    db: DBSession,
    user: Annotated[User, Depends(require_roles("admin"))],
    status_filter: str | None = None,
    organiser_id: int | None = None,
):
    q = (
        select(Booking)
        .join(AppointmentType, Booking.appointment_type_id == AppointmentType.id)
        .outerjoin(User, Booking.customer_id == User.id)
        .outerjoin(Resource, Booking.resource_id == Resource.id)
        .order_by(Booking.start_time.desc())
        .options(
            selectinload(Booking.appointment_type),
            selectinload(Booking.resource),
            selectinload(Booking.customer),
        )
    )
    if status_filter:
        q = q.where(Booking.status == status_filter)
    if organiser_id:
        q = q.where(AppointmentType.organiser_id == organiser_id)
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
        b = booking_service.organiser_confirm(db, booking_id, user.id, user.role)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return _out(b)


@router.post("/{booking_id}/complete", response_model=BookingOut)
def complete(
    booking_id: int,
    db: DBSession,
    user: Annotated[User, Depends(require_roles("organiser", "admin"))],
):
    try:
        b = booking_service.mark_completed(db, booking_id, user.id, user.role)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return _out(b)


@router.post("/payments/phonepe/initiate", response_model=PhonePePaymentInitiateOut)
def phonepe_initiate(
    data: PhonePePaymentInitiateIn,
    user: Annotated[User, Depends(require_roles("customer", "admin"))],
):
    _ = user
    try:
        result = initiate_payment(
            amount_paisa=data.amount_paisa,
            redirect_url=data.redirect_url,
            merchant_order_id=data.merchant_order_id,
        )
        return PhonePePaymentInitiateOut(
            merchant_order_id=result.merchant_order_id,
            state=result.state,
            redirect_url=result.redirect_url,
            order_id=result.order_id,
            expire_at=result.expire_at,
        )
    except PhonePeNotConfiguredError as e:
        logger.exception("PhonePe initiate failed: configuration/runtime issue")
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        logger.warning("PhonePe initiate rejected: %s", e)
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/payments/phonepe/status", response_model=PhonePePaymentStatusOut)
def phonepe_status(
    data: PhonePePaymentStatusIn,
    user: Annotated[User, Depends(require_roles("customer", "admin"))],
):
    _ = user
    try:
        result = fetch_order_status(data.merchant_order_id)
        return PhonePePaymentStatusOut(
            state=result.state,
            amount=result.amount,
            merchant_order_id=result.merchant_order_id,
            raw=result.raw,
        )
    except PhonePeNotConfiguredError as e:
        logger.exception("PhonePe status failed: configuration/runtime issue")
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        logger.warning("PhonePe status rejected: %s", e)
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/payments/phonepe/validate-callback")
def phonepe_validate_callback(
    data: PhonePeCallbackValidateIn,
    user: Annotated[User, Depends(require_roles("admin"))],
):
    _ = user
    try:
        return validate_callback(
            authorization_header_data=data.authorization_header,
            callback_response_data=data.callback_body,
        )
    except PhonePeNotConfiguredError as e:
        logger.exception("PhonePe callback validation failed: configuration/runtime issue")
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        logger.warning("PhonePe callback validation rejected: %s", e)
        raise HTTPException(status_code=400, detail=str(e))
