from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, select
from app.deps import CurrentUser, DBSession, require_roles
from app.models.customer_tag import CustomerTag
from app.models.provider_note import ProviderNote
from app.schemas.customer_tag import CustomerTagCreate, CustomerTagOut
from app.schemas.provider_note import ProviderNoteCreate, ProviderNoteOut

router = APIRouter(prefix="/provider-notes", tags=["Provider Notes"])

# ─── Notes ───

@router.get("/notes/{customer_id}", response_model=list[ProviderNoteOut])
def list_notes(
    db: DBSession,
    user: Annotated[CurrentUser, Depends(require_roles("organiser", "admin"))],
    customer_id: int,
):
    q = (
        select(ProviderNote)
        .where(
            ProviderNote.provider_id == user.id,
            ProviderNote.customer_id == customer_id,
        )
        .order_by(ProviderNote.created_at.asc())
    )
    rows = db.execute(q).scalars().all()
    return rows


@router.post("/notes", response_model=ProviderNoteOut)
def create_note(
    db: DBSession,
    user: Annotated[CurrentUser, Depends(require_roles("organiser", "admin"))],
    body: ProviderNoteCreate,
):
    note = ProviderNote(
        provider_id=user.id,
        customer_id=body.customer_id,
        content=body.content,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.get("/notes/search", response_model=list[ProviderNoteOut])
def search_notes(
    db: DBSession,
    user: Annotated[CurrentUser, Depends(require_roles("organiser", "admin"))],
    q: str,
):
    q_lower = f"%{q.lower()}%"
    stmt = (
        select(ProviderNote)
        .where(
            ProviderNote.provider_id == user.id,
            ProviderNote.content.ilike(q_lower),
        )
        .order_by(desc(ProviderNote.created_at))
    )
    rows = db.execute(stmt).scalars().all()
    return rows


# ─── Tags ───

@router.get("/tags/{customer_id}", response_model=list[CustomerTagOut])
def list_tags(
    db: DBSession,
    user: Annotated[CurrentUser, Depends(require_roles("organiser", "admin"))],
    customer_id: int,
):
    q = (
        select(CustomerTag)
        .where(
            CustomerTag.provider_id == user.id,
            CustomerTag.customer_id == customer_id,
        )
        .order_by(CustomerTag.created_at.desc())
    )
    rows = db.execute(q).scalars().all()
    return rows


@router.post("/tags", response_model=CustomerTagOut)
def create_tag(
    db: DBSession,
    user: Annotated[CurrentUser, Depends(require_roles("organiser", "admin"))],
    body: CustomerTagCreate,
):
    tag = CustomerTag(
        provider_id=user.id,
        customer_id=body.customer_id,
        label=body.label,
        color=body.color or "#e5e7eb",
        is_system_suggested=body.is_system_suggested,
    )
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


@router.delete("/tags/{tag_id}")
def delete_tag(
    db: DBSession,
    user: Annotated[CurrentUser, Depends(require_roles("organiser", "admin"))],
    tag_id: int,
):
    tag = db.get(CustomerTag, tag_id)
    if not tag or tag.provider_id != user.id:
        raise HTTPException(404, "Tag not found")
    db.delete(tag)
    db.commit()
    return {"ok": True}
