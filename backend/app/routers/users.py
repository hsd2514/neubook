from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import select

from app.deps import CurrentUser, DBSession, require_roles
from app.models.user import User
from app.schemas.auth import UserPublic
from app.services.email_service import send_email
router = APIRouter(prefix="/users", tags=["users"])


class UserUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=1, max_length=255)
    email: EmailStr | None = None


class BrandingOut(BaseModel):
    organiser_id: int
    display_name: str
    logo_url: str | None
    primary_color: str
    accent_color: str
    theme: str
    booking_domain: str | None


class BrandingUpdate(BaseModel):
    brand_display_name: str | None = Field(None, min_length=1, max_length=255)
    brand_logo_url: str | None = Field(None, max_length=512)
    brand_primary_color: str | None = None
    brand_accent_color: str | None = None
    brand_theme: str | None = None
    brand_booking_domain: str | None = Field(None, max_length=255)

    @field_validator("brand_primary_color", "brand_accent_color")
    @classmethod
    def validate_hex_color(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if len(v) != 7 or not v.startswith("#"):
            raise ValueError("Color must be in #RRGGBB format")
        for ch in v[1:]:
            if ch.lower() not in "0123456789abcdef":
                raise ValueError("Color must be in #RRGGBB format")
        return v.lower()

    @field_validator("brand_theme")
    @classmethod
    def validate_theme(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if v not in ("light", "dark"):
            raise ValueError("Theme must be light or dark")
        return v


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


class AdminTestEmailIn(BaseModel):
    to_email: EmailStr | None = None
    subject: str | None = Field(default="Neubook test email", max_length=255)
    message: str | None = Field(default="This is a test email from Neubook Admin.", max_length=4000)


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


def _branding_out(user: User) -> BrandingOut:
    return BrandingOut(
        organiser_id=user.id,
        display_name=(user.brand_display_name or user.full_name).strip(),
        logo_url=user.brand_logo_url,
        primary_color=user.brand_primary_color,
        accent_color=user.brand_accent_color,
        theme=user.brand_theme,
        booking_domain=user.brand_booking_domain,
    )


@router.get("/{user_id}/branding", response_model=BrandingOut)
def get_branding(user_id: int, db: DBSession):
    row = db.get(User, user_id)
    if not row or row.role not in ("organiser", "admin"):
        raise HTTPException(status_code=404, detail="Not found")
    return _branding_out(row)


@router.patch("/me/branding", response_model=BrandingOut)
def update_branding(
    data: BrandingUpdate,
    db: DBSession,
    user: Annotated[User, Depends(require_roles("organiser", "admin"))],
):
    patch = data.model_dump(exclude_unset=True)
    for k, v in patch.items():
        setattr(user, k, v)
    db.commit()
    db.refresh(user)
    return _branding_out(user)


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


@router.post("/admin/test-email")
def admin_test_email(
    data: AdminTestEmailIn,
    user: Annotated[User, Depends(require_roles("admin"))],
):
    to_email = data.to_email or user.email
    ok = send_email(
        to_email,
        data.subject or "Neubook test email",
        (data.message or "This is a test email from Neubook Admin.") + f"\n\nTriggered by: {user.email}",
    )
    if not ok:
        raise HTTPException(status_code=503, detail="Test email failed. Check SMTP config/logs.")
    return {"ok": True, "to_email": to_email}
