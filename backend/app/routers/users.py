from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import func, select

from app.deps import CurrentUser, DBSession, require_roles
from app.models.user import User
from app.schemas.auth import UserPublic
router = APIRouter(prefix="/users", tags=["users"])


class UserUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=1, max_length=255)
    email: EmailStr | None = None


class AdminUserPatch(BaseModel):
    is_active: bool | None = None
    role: str | None = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if v not in ("customer", "organiser", "admin"):
            raise ValueError("Invalid role")
        return v


@router.patch("/me", response_model=UserPublic)
def update_me(data: UserUpdate, db: DBSession, user: CurrentUser):
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.email is not None:
        exists = db.execute(select(User).where(User.email == data.email, User.id != user.id)).scalar_one_or_none()
        if exists:
            raise HTTPException(status_code=400, detail="Email in use")
        user.email = data.email
    db.commit()
    db.refresh(user)
    return UserPublic.model_validate(user)


@router.get("", response_model=list[UserPublic])
def list_users(db: DBSession, user: Annotated[User, Depends(require_roles("admin"))]):
    rows = db.execute(select(User).order_by(User.id.desc())).scalars().all()
    return [UserPublic.model_validate(u) for u in rows]


@router.patch("/{user_id}", response_model=UserPublic)
def admin_patch_user(
    user_id: int,
    data: AdminUserPatch,
    db: DBSession,
    user: Annotated[User, Depends(require_roles("admin"))],
):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="Not found")
    if data.is_active is not None:
        u.is_active = data.is_active
    if data.role is not None:
        u.role = data.role
    db.commit()
    db.refresh(u)
    return UserPublic.model_validate(u)
