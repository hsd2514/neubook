from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select

from app.deps import CurrentUser, DBSession, require_roles
from app.models.user import User
from app.models.waitlist import WaitlistEntry
from app.schemas.waitlist import WaitlistEntryOut, WaitlistJoinRequest, SlotWaitlistInfo
from app.services import waitlist_service
from app.services.waitlist_service import get_slot_waitlist_count

router = APIRouter(prefix="/waitlist", tags=["waitlist"])


def _out(e: WaitlistEntry) -> WaitlistEntryOut:
    return WaitlistEntryOut(
        id=e.id,
        customer_id=e.customer_id,
        appointment_type_id=e.appointment_type_id,
        resource_id=e.resource_id,
        start_time=e.start_time,
        seat_ids=e.seat_ids,
        answers=e.answers,
        position=e.position,
        status=e.status,
        created_at=e.created_at,
    )


@router.post("", response_model=WaitlistEntryOut, status_code=201)
def join(
    data: WaitlistJoinRequest,
    db: DBSession,
    user: Annotated[User, Depends(require_roles("customer", "admin"))],
):
    """Join the waitlist for a fully-booked slot."""
    try:
        entry = waitlist_service.join_waitlist(
            db,
            customer_id=user.id,
            appointment_type_id=data.appointment_type_id,
            resource_id=data.resource_id,
            start_time=data.start_time,
            seat_ids=data.seat_ids,
            answers=data.answers,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return _out(entry)


@router.get("/mine", response_model=list[WaitlistEntryOut])
def my_waitlist(db: DBSession, user: CurrentUser):
    """Return the authenticated customer's active waitlist entries."""
    rows = (
        db.execute(
            select(WaitlistEntry)
            .where(
                WaitlistEntry.customer_id == user.id,
                WaitlistEntry.status == "waiting",
            )
            .order_by(WaitlistEntry.created_at.desc())
        )
        .scalars()
        .all()
    )
    return [_out(e) for e in rows]


@router.delete("/{entry_id}", response_model=WaitlistEntryOut)
def leave(entry_id: int, db: DBSession, user: CurrentUser):
    """Leave (cancel) a waitlist entry."""
    try:
        entry = waitlist_service.leave_waitlist(db, entry_id, user.id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return _out(entry)


@router.get("/slot-info", response_model=SlotWaitlistInfo)
def slot_info(
    db: DBSession,
    user: CurrentUser,
    appointment_type_id: int = Query(...),
    start_time: str = Query(...),
    resource_id: Optional[int] = Query(None),
):
    """Return the waitlist count for a slot and the user's position if applicable."""
    from datetime import datetime, timezone

    try:
        dt = datetime.fromisoformat(start_time)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        dt = dt.astimezone(timezone.utc).replace(second=0, microsecond=0)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid start_time format")

    count = get_slot_waitlist_count(db, appointment_type_id, resource_id, dt)

    # Check if this user is already on the waitlist
    from sqlalchemy import select as sa_select
    entry = db.execute(
        sa_select(WaitlistEntry).where(
            WaitlistEntry.customer_id == user.id,
            WaitlistEntry.appointment_type_id == appointment_type_id,
            WaitlistEntry.resource_id == resource_id,
            WaitlistEntry.start_time == dt,
            WaitlistEntry.status == "waiting",
        )
    ).scalar_one_or_none()

    return SlotWaitlistInfo(
        appointment_type_id=appointment_type_id,
        resource_id=resource_id,
        start_time=dt,
        waiting_count=count,
        user_position=entry.position if entry else None,
    )
