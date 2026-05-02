import io
from typing import Annotated
import logging

from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor, white, black
from reportlab.pdfgen import canvas
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.deps import CurrentUser, DBSession, require_roles
from app.models.appointment_type import AppointmentType
from app.models.booking import Booking
from app.models.booking_seat import BookingSeat
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
from app.services.booking_service import SlotFullError
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


def _money_inr(paisa: int) -> str:
    return f"INR {paisa / 100:.2f}"


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
    except SlotFullError as e:
        if idempotency_key is not None:
            store_record(
                db, idempotency_key, user.id, ENDPOINT_BOOKING_CREATE,
                409, {"detail": str(e), "slot_full": True},
            )
        raise HTTPException(status_code=409, detail=str(e))
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


@router.get("/{booking_id}/receipt.pdf")
def download_booking_receipt(booking_id: int, db: DBSession, user: CurrentUser):
    booking = (
        db.execute(
            select(Booking)
            .where(Booking.id == booking_id)
            .options(
                selectinload(Booking.appointment_type).selectinload(AppointmentType.organiser),
                selectinload(Booking.resource),
                selectinload(Booking.customer),
                selectinload(Booking.seat_links).selectinload(BookingSeat.seat),
            )
        )
        .scalars()
        .first()
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if user.role == "customer" and booking.customer_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if user.role == "organiser":
        at = booking.appointment_type
        if not at or at.organiser_id != user.id:
            raise HTTPException(status_code=403, detail="Forbidden")

    at = booking.appointment_type
    organiser = at.organiser if at else None
    primary_hex = (organiser.brand_primary_color if organiser else "#714b67").lstrip("#")
    try:
        primary = HexColor("#" + primary_hex)
    except Exception:
        primary = HexColor("#714b67")

    customer_name = booking.customer.full_name if booking.customer else "-"
    customer_email = booking.customer.email if booking.customer else "-"
    service_name = at.name if at else "-"
    resource_name = booking.resource.name if booking.resource else "-"
    start = booking.start_time.strftime("%d %b %Y, %I:%M %p")
    end = booking.end_time.strftime("%d %b %Y, %I:%M %p")
    seat_labels = [link.seat.label for link in (booking.seat_links or []) if link.seat]

    advance_payment_on = bool(at and at.advance_payment)
    payment_label = "PAID" if advance_payment_on and booking.payment_status == "paid" else "NOT PAID"
    total_paisa = 0
    if advance_payment_on and at:
        total_paisa = max(0, int(at.service_amount_paisa) * max(1, int(booking.capacity)))

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    w, h = A4
    m = 40
    y = h - m

    # ── helpers ──
    def hex_to_rgb(hex_str):
        h = hex_str.lstrip("#")
        return tuple(int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))

    def _header_band():
        pdf.setFillColor(primary)
        pdf.rect(m, y - 38, w - m * 2, 38, fill=1, stroke=0)
        pdf.setFillColor(white)
        pdf.setFont("Helvetica-Bold", 22)
        pdf.drawString(m + 10, y - 26, "Neubook")
        pdf.setFont("Helvetica", 11)
        pdf.drawRightString(w - m - 10, y - 26, "BOOKING RECEIPT")

    def _section(title, content_lines, box_y_start):
        box_h = 22 + 16 * len(content_lines)
        pdf.setStrokeColor(primary)
        pdf.setLineWidth(1.5)
        pdf.roundRect(m, box_y_start - box_h, w - m * 2, box_h, 4, fill=0, stroke=1)
        pdf.setFillColor(primary)
        pdf.rect(m, box_y_start - 20, w - m * 2, 20, fill=1, stroke=0)
        pdf.setFillColor(white)
        pdf.setFont("Helvetica-Bold", 11)
        pdf.drawString(m + 8, box_y_start - 14, title)
        pdf.setFillColor(black)
        pdf.setFont("Helvetica", 10)
        ly = box_y_start - 34
        for label, value in content_lines:
            pdf.drawString(m + 10, ly, label)
            pdf.drawRightString(w - m - 10, ly, value)
            ly -= 14
        return box_y_start - box_h - 14

    def _payment_band(py_start):
        band_h = 48
        pdf.setFillColor(HexColor("#f3f4f6"))
        pdf.roundRect(m, py_start - band_h, w - m * 2, band_h, 4, fill=1, stroke=0)
        pdf.setFillColor(black)
        pdf.setFont("Helvetica-Bold", 11)
        pdf.drawString(m + 10, py_start - 20, "Payment Status")
        if advance_payment_on:
            pdf.setFont("Helvetica", 10)
            pdf.drawRightString(w - m - 10, py_start - 20, f"Total: {_money_inr(total_paisa)}")
        badge_color = HexColor("#16a34a") if payment_label == "PAID" else HexColor("#dc2626")
        pdf.setFillColor(badge_color)
        bw = pdf.stringWidth(payment_label, "Helvetica-Bold", 10) + 14
        badge_y = py_start - 42
        pdf.roundRect(m + 10, badge_y, bw, 18, 3, fill=1, stroke=0)
        pdf.setFillColor(white)
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(m + 17, badge_y + 5, payment_label)
        return py_start - band_h - 14

    def _seat_table(sy_start):
        if not seat_labels:
            return sy_start
        rows = [[f"Seat {i + 1}", label] for i, label in enumerate(seat_labels)]
        th = 18
        rh = 16
        tw = w - m * 2
        table_h = th + rh * len(rows)
        pdf.setStrokeColor(HexColor("#e5e7eb"))
        pdf.setLineWidth(0.5)
        pdf.roundRect(m, sy_start - table_h, tw, table_h, 4, fill=0, stroke=1)
        pdf.setFillColor(primary)
        pdf.rect(m, sy_start - th, tw, th, fill=1, stroke=0)
        pdf.setFillColor(white)
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(m + 10, sy_start - 12, "#")
        pdf.drawString(m + 80, sy_start - 12, "Seat Label")
        for i, (_, label) in enumerate(rows):
            ry = sy_start - th - rh * (i + 1)
            if i % 2 == 1:
                pdf.setFillColor(HexColor("#f9fafb"))
                pdf.rect(m, ry, tw, rh, fill=1, stroke=0)
            pdf.setFillColor(black)
            pdf.setFont("Helvetica", 9)
            pdf.drawString(m + 10, ry + 4, str(i + 1))
            pdf.drawString(m + 80, ry + 4, label)
        return sy_start - table_h - 14

    # ── build page ──
    _header_band()
    y -= 52

    y = _section("Customer", [
        ("Name", customer_name),
        ("Email", customer_email),
        ("Booking Reference", f"#{booking.id}"),
    ], y)

    y = _section("Appointment", [
        ("Service", service_name),
        ("Date & Time", f"{start} to {end}"),
        ("Resource / Venue", resource_name),
        ("Seats Booked", str(booking.capacity)),
        ("Booking Status", booking.status.upper()),
    ], y)

    y = _seat_table(y)
    y = _payment_band(y)

    pdf.setStrokeColor(HexColor("#e5e7eb"))
    pdf.setLineWidth(0.5)
    pdf.line(m, y - 4, w - m, y - 4)

    pdf.setFillColor(HexColor("#6b7280"))
    pdf.setFont("Helvetica-Oblique", 9)
    pdf.drawCentredString(w / 2, 50, "Thank you for booking with Neubook")
    pdf.setFont("Helvetica", 8)
    pdf.drawCentredString(w / 2, 36, "This receipt serves as your booking ticket.")

    pdf.showPage()
    pdf.save()
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="receipt-booking-{booking.id}.pdf"'},
    )


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
