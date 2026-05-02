import secrets
from datetime import date, time
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.deps import DBSession, require_roles
from app.models.appointment_type import AppointmentType
from app.models.user import User
from app.models.question import Question
from app.models.resource import Resource
from app.models.schedule import Schedule
from app.models.blocked_slot import BlockedSlot
from app.schemas.appointment import (
    AppointmentTypeCreate,
    AppointmentTypeOut,
    AppointmentTypeUpdate,
    BlockedSlotCreate,
    BlockedSlotOut,
    QuestionCreate,
    QuestionOut,
    ResourceCreate,
    ResourceOut,
    ScheduleCreate,
    ScheduleOut,
)
from app.services.availability import get_availability

router = APIRouter(prefix="/appointments", tags=["appointments"])


def _serialize_schedule(s: Schedule) -> ScheduleOut:
    return ScheduleOut(
        id=s.id,
        appointment_type_id=s.appointment_type_id,
        schedule_mode=s.schedule_mode,
        resource_id=s.resource_id,
        day_of_week=s.day_of_week,
        slot_date=s.slot_date.isoformat() if s.slot_date else None,
        start_time=s.start_time.strftime("%H:%M"),
        end_time=s.end_time.strftime("%H:%M"),
    )


def _serialize_blocked_slot(b: BlockedSlot) -> BlockedSlotOut:
    return BlockedSlotOut(
        id=b.id,
        appointment_type_id=b.appointment_type_id,
        block_type=b.block_type,
        resource_id=b.resource_id,
        start_date=b.start_date.isoformat(),
        end_date=b.end_date.isoformat(),
        day_of_week=b.day_of_week,
        start_time=b.start_time.strftime("%H:%M") if b.start_time else None,
        end_time=b.end_time.strftime("%H:%M") if b.end_time else None,
    )


def _serialize_type(at: AppointmentType) -> AppointmentTypeOut:
    return AppointmentTypeOut(
        id=at.id,
        organiser_id=at.organiser_id,
        name=at.name,
        description=at.description,
        duration_minutes=at.duration_minutes,
        appointment_kind=at.appointment_kind,
        slot_schedule=at.slot_schedule,
        visibility=at.visibility,
        is_published=at.is_published,
        manage_capacity=at.manage_capacity,
        advance_payment=at.advance_payment,
        manual_confirmation=at.manual_confirmation,
        assignment_mode=at.assignment_mode,
        service_amount_paisa=at.service_amount_paisa,
        max_bookings_per_slot=at.max_bookings_per_slot,
        share_link=at.share_link,
        resources=[ResourceOut.model_validate(r) for r in (at.resources or [])],
        schedules=[_serialize_schedule(s) for s in (at.schedules or [])],
        blocked_slots=[_serialize_blocked_slot(b) for b in (at.blocked_slots or [])],
        questions=[QuestionOut.model_validate(q) for q in (at.questions or [])],
    )


@router.get("/public", response_model=list[AppointmentTypeOut])
def list_public(db: DBSession):
    rows = (
        db.execute(
            select(AppointmentType)
            .options(
                joinedload(AppointmentType.resources),
                joinedload(AppointmentType.schedules),
                joinedload(AppointmentType.blocked_slots),
                joinedload(AppointmentType.questions),
            )
            .where(
                AppointmentType.is_published.is_(True),
                AppointmentType.visibility == "public",
            )
        )
        .unique()
        .scalars()
        .all()
    )
    return [_serialize_type(at) for at in rows]


@router.get("/by-share/{share_link}", response_model=AppointmentTypeOut)
def get_by_share(share_link: str, db: DBSession):
    at = (
        db.execute(
            select(AppointmentType)
            .options(
                joinedload(AppointmentType.resources),
                joinedload(AppointmentType.schedules),
                joinedload(AppointmentType.blocked_slots),
                joinedload(AppointmentType.questions),
            )
            .where(AppointmentType.share_link == share_link)
        )
        .unique()
        .scalar_one_or_none()
    )
    if not at:
        raise HTTPException(status_code=404, detail="Not found")
    if at.visibility == "private":
        raise HTTPException(status_code=404, detail="Not found")
    return _serialize_type(at)


@router.get("/mine", response_model=list[AppointmentTypeOut])
def list_mine(db: DBSession, user: Annotated[User, Depends(require_roles("organiser", "admin"))]):
    rows = (
        db.execute(
            select(AppointmentType)
            .options(
                joinedload(AppointmentType.resources),
                joinedload(AppointmentType.schedules),
                joinedload(AppointmentType.blocked_slots),
                joinedload(AppointmentType.questions),
            )
            .where(AppointmentType.organiser_id == user.id)
        )
        .unique()
        .scalars()
        .all()
    )
    return [_serialize_type(at) for at in rows]


@router.post("/mine", response_model=AppointmentTypeOut)
def create_mine(
    data: AppointmentTypeCreate,
    db: DBSession,
    user: Annotated[User, Depends(require_roles("organiser", "admin"))],
):
    d = data.model_dump()
    at = AppointmentType(
        organiser_id=user.id,
        share_link=secrets.token_urlsafe(8),
        name=d["name"],
        description=d.get("description"),
        duration_minutes=d["duration_minutes"],
        appointment_kind=d["appointment_kind"],
        slot_schedule=d["slot_schedule"],
        visibility=d["visibility"],
        is_published=d["is_published"],
        manage_capacity=d["manage_capacity"],
        advance_payment=d["advance_payment"],
        manual_confirmation=d["manual_confirmation"],
        assignment_mode=d["assignment_mode"],
        service_amount_paisa=d["service_amount_paisa"],
        max_bookings_per_slot=d["max_bookings_per_slot"],
    )
    db.add(at)
    db.commit()
    db.refresh(at)
    at = (
        db.execute(
            select(AppointmentType)
            .options(
                joinedload(AppointmentType.resources),
                joinedload(AppointmentType.schedules),
                joinedload(AppointmentType.blocked_slots),
                joinedload(AppointmentType.questions),
            )
            .where(AppointmentType.id == at.id)
        )
        .unique()
        .scalar_one()
    )
    return _serialize_type(at)


@router.patch("/mine/{appointment_id}", response_model=AppointmentTypeOut)
def update_mine(
    appointment_id: int,
    data: AppointmentTypeUpdate,
    db: DBSession,
    user: Annotated[User, Depends(require_roles("organiser", "admin"))],
):
    at = db.get(AppointmentType, appointment_id)
    if not at or at.organiser_id != user.id:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(at, k, v)
    db.commit()
    at = (
        db.execute(
            select(AppointmentType)
            .options(
                joinedload(AppointmentType.resources),
                joinedload(AppointmentType.schedules),
                joinedload(AppointmentType.blocked_slots),
                joinedload(AppointmentType.questions),
            )
            .where(AppointmentType.id == at.id)
        )
        .unique()
        .scalar_one()
    )
    return _serialize_type(at)


@router.post("/mine/{appointment_id}/resources", response_model=ResourceOut)
def add_resource(
    appointment_id: int,
    data: ResourceCreate,
    db: DBSession,
    user: Annotated[User, Depends(require_roles("organiser", "admin"))],
):
    at = db.get(AppointmentType, appointment_id)
    if not at or at.organiser_id != user.id:
        raise HTTPException(status_code=404, detail="Not found")
    r = Resource(appointment_type_id=appointment_id, name=data.name, working_hours=data.working_hours)
    db.add(r)
    db.commit()
    db.refresh(r)
    return ResourceOut.model_validate(r)


@router.delete("/mine/{appointment_id}/resources/{resource_id}")
def delete_resource(
    appointment_id: int,
    resource_id: int,
    db: DBSession,
    user: Annotated[User, Depends(require_roles("organiser", "admin"))],
):
    at = db.get(AppointmentType, appointment_id)
    if not at or at.organiser_id != user.id:
        raise HTTPException(status_code=404, detail="Not found")
    r = db.get(Resource, resource_id)
    if not r or r.appointment_type_id != appointment_id:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(r)
    db.commit()
    return {"ok": True}


@router.post("/mine/{appointment_id}/schedules", response_model=ScheduleOut)
def add_schedule(
    appointment_id: int,
    data: ScheduleCreate,
    db: DBSession,
    user: Annotated[User, Depends(require_roles("organiser", "admin"))],
):
    at = db.get(AppointmentType, appointment_id)
    if not at or at.organiser_id != user.id:
        raise HTTPException(status_code=404, detail="Not found")
    try:
        sh, sm = data.start_time.split(":")
        eh, em = data.end_time.split(":")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid time format")
    slot_date = None
    if data.slot_date:
        try:
            slot_date = date.fromisoformat(data.slot_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid slot_date format")
    s = Schedule(
        appointment_type_id=appointment_id,
        schedule_mode=data.schedule_mode,
        resource_id=data.resource_id,
        day_of_week=data.day_of_week,
        slot_date=slot_date,
        start_time=time(int(sh), int(sm)),
        end_time=time(int(eh), int(em)),
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return _serialize_schedule(s)


@router.delete("/mine/{appointment_id}/schedules/{schedule_id}")
def delete_schedule(
    appointment_id: int,
    schedule_id: int,
    db: DBSession,
    user: Annotated[User, Depends(require_roles("organiser", "admin"))],
):
    at = db.get(AppointmentType, appointment_id)
    if not at or at.organiser_id != user.id:
        raise HTTPException(status_code=404, detail="Not found")
    s = db.get(Schedule, schedule_id)
    if not s or s.appointment_type_id != appointment_id:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(s)
    db.commit()
    return {"ok": True}


@router.post("/mine/{appointment_id}/blocked-slots/bulk", response_model=list[BlockedSlotOut])
def add_blocked_slots_bulk(
    appointment_id: int,
    data: list[BlockedSlotCreate],
    db: DBSession,
    user: Annotated[User, Depends(require_roles("organiser", "admin"))],
):
    at = db.get(AppointmentType, appointment_id)
    if not at or at.organiser_id != user.id:
        raise HTTPException(status_code=404, detail="Not found")
    if not data:
        raise HTTPException(status_code=400, detail="At least one blocked slot is required")

    created: list[BlockedSlot] = []
    for item in data:
        try:
            start_date = date.fromisoformat(item.start_date)
            end_date = date.fromisoformat(item.end_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")
        if end_date < start_date:
            raise HTTPException(status_code=400, detail="end_date must be on or after start_date")

        start_time = None
        end_time = None
        if item.start_time and item.end_time:
            try:
                sh, sm = item.start_time.split(":")
                eh, em = item.end_time.split(":")
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid time format")
            start_time = time(int(sh), int(sm))
            end_time = time(int(eh), int(em))
            if start_time >= end_time:
                raise HTTPException(status_code=400, detail="end_time must be after start_time")

        block = BlockedSlot(
            appointment_type_id=appointment_id,
            resource_id=item.resource_id,
            block_type=item.block_type,
            start_date=start_date,
            end_date=end_date,
            day_of_week=item.day_of_week,
            start_time=start_time,
            end_time=end_time,
        )
        db.add(block)
        created.append(block)

    db.commit()
    for block in created:
        db.refresh(block)
    return [_serialize_blocked_slot(b) for b in created]


@router.delete("/mine/{appointment_id}/blocked-slots/{blocked_slot_id}")
def delete_blocked_slot(
    appointment_id: int,
    blocked_slot_id: int,
    db: DBSession,
    user: Annotated[User, Depends(require_roles("organiser", "admin"))],
):
    at = db.get(AppointmentType, appointment_id)
    if not at or at.organiser_id != user.id:
        raise HTTPException(status_code=404, detail="Not found")
    blocked = db.get(BlockedSlot, blocked_slot_id)
    if not blocked or blocked.appointment_type_id != appointment_id:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(blocked)
    db.commit()
    return {"ok": True}


@router.post("/mine/{appointment_id}/questions", response_model=QuestionOut)
def add_question(
    appointment_id: int,
    data: QuestionCreate,
    db: DBSession,
    user: Annotated[User, Depends(require_roles("organiser", "admin"))],
):
    at = db.get(AppointmentType, appointment_id)
    if not at or at.organiser_id != user.id:
        raise HTTPException(status_code=404, detail="Not found")
    q = Question(appointment_type_id=appointment_id, **data.model_dump())
    db.add(q)
    db.commit()
    db.refresh(q)
    return QuestionOut.model_validate(q)


@router.delete("/mine/{appointment_id}/questions/{question_id}")
def delete_question(
    appointment_id: int,
    question_id: int,
    db: DBSession,
    user: Annotated[User, Depends(require_roles("organiser", "admin"))],
):
    at = db.get(AppointmentType, appointment_id)
    if not at or at.organiser_id != user.id:
        raise HTTPException(status_code=404, detail="Not found")
    q = db.get(Question, question_id)
    if not q or q.appointment_type_id != appointment_id:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(q)
    db.commit()
    return {"ok": True}


@router.get("/{appointment_id}/availability")
def availability(
    appointment_id: int,
    db: DBSession,
    from_date: str,
    to_date: str,
    resource_id: int | None = None,
    tz: str = "UTC",
):
    from datetime import date as ddate

    try:
        fd = ddate.fromisoformat(from_date)
        td = ddate.fromisoformat(to_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date")
    try:
        days = get_availability(db, appointment_id, resource_id, fd, td, tz)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return days
