import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.auth_tokens import EmailOTP, PasswordResetToken
from app.models.user import User
from app.schemas.auth import SignupRequest, UserPublic
from app.utils.jwt import create_access_token, create_refresh_token
from app.utils.password import hash_password, verify_password


def _otp_code() -> str:
    return f"{secrets.randbelow(900000) + 100000:06d}"


def signup_request(db: Session, data: SignupRequest) -> None:
    existing = db.execute(select(User).where(User.email == data.email)).scalar_one_or_none()
    if existing and existing.is_active:
        raise ValueError("Email already registered")
    if existing and not existing.is_active:
        existing.full_name = data.full_name
        existing.password_hash = hash_password(data.password)
        db.flush()
        user = existing
    else:
        user = User(
            full_name=data.full_name,
            email=data.email,
            password_hash=hash_password(data.password),
            role="customer",
            is_active=False,
        )
        db.add(user)
        db.flush()

    expires = datetime.now(timezone.utc) + timedelta(minutes=15)
    code = _otp_code()
    db.add(
        EmailOTP(
            email=data.email,
            code=code,
            purpose="signup",
            expires_at=expires,
            consumed=False,
        )
    )
    db.commit()
    # Dev: OTP logged; in production send email
    print(f"[Neubook] OTP for {data.email}: {code}")


def verify_otp_and_activate(db: Session, email: str, code: str):
    now = datetime.now(timezone.utc)
    row = db.execute(
        select(EmailOTP)
        .where(
            EmailOTP.email == email,
            EmailOTP.code == code,
            EmailOTP.purpose == "signup",
            EmailOTP.consumed.is_(False),
            EmailOTP.expires_at > now,
        )
        .order_by(EmailOTP.id.desc())
    ).scalar_one_or_none()
    if not row:
        raise ValueError("Invalid or expired code")

    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if not user:
        raise ValueError("User not found")

    row.consumed = True
    user.is_active = True
    db.commit()
    db.refresh(user)
    return _tokens_for_user(user)


def login(db: Session, email: str, password: str):
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if not user or not verify_password(password, user.password_hash):
        raise ValueError("Invalid credentials")
    if not user.is_active:
        raise ValueError("Account not verified or deactivated")
    return _tokens_for_user(user)


def refresh_tokens(db: Session, refresh_token: str):
    from app.utils.jwt import decode_token

    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise ValueError("Invalid refresh token")
    user = db.get(User, int(payload["sub"]))
    if not user or not user.is_active:
        raise ValueError("Invalid user")
    return _tokens_for_user(user)


def forgot_password(db: Session, email: str) -> str | None:
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if not user:
        return None
    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=1)
    db.add(PasswordResetToken(user_id=user.id, token=token, expires_at=expires, consumed=False))
    db.commit()
    print(f"[Neubook] Password reset token for {email}: {token}")
    return token


def reset_password(db: Session, token: str, new_password: str) -> None:
    now = datetime.now(timezone.utc)
    row = db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.token == token,
            PasswordResetToken.consumed.is_(False),
            PasswordResetToken.expires_at > now,
        )
    ).scalar_one_or_none()
    if not row:
        raise ValueError("Invalid or expired token")
    user = db.get(User, row.user_id)
    if not user:
        raise ValueError("User not found")
    user.password_hash = hash_password(new_password)
    row.consumed = True
    db.commit()


def _tokens_for_user(user: User):
    access = create_access_token(user.id, {"role": user.role})
    refresh = create_refresh_token(user.id)
    return {
        "access_token": access,
        "refresh_token": refresh,
        "user": UserPublic.model_validate(user),
    }
