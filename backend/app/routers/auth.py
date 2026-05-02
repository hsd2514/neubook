from fastapi import APIRouter, HTTPException, status

from app.deps import CurrentUser, DBSession
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    ResetPasswordRequest,
    SignupRequest,
    TokenPair,
    VerifyOtpRequest,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=MessageResponse)
def signup(data: SignupRequest, db: DBSession):
    try:
        auth_service.signup_request(db, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return MessageResponse(message="Verification code sent. Check server logs in development.")


@router.post("/verify-otp", response_model=TokenPair)
def verify_otp(data: VerifyOtpRequest, db: DBSession):
    try:
        out = auth_service.verify_otp_and_activate(db, data.email, data.code)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return TokenPair(**out)


@router.post("/login", response_model=TokenPair)
def login(data: LoginRequest, db: DBSession):
    try:
        out = auth_service.login(db, data.email, data.password)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    return TokenPair(**out)


@router.post("/refresh", response_model=TokenPair)
def refresh(data: RefreshRequest, db: DBSession):
    try:
        out = auth_service.refresh_tokens(db, data.refresh_token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    return TokenPair(**out)


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(data: ForgotPasswordRequest, db: DBSession):
    token = auth_service.forgot_password(db, data.email)
    msg = "If the email exists, reset instructions were sent."
    if token:
        msg += " (dev: token printed to server console)"
    return MessageResponse(message=msg)


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(data: ResetPasswordRequest, db: DBSession):
    try:
        auth_service.reset_password(db, data.token, data.new_password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return MessageResponse(message="Password updated")


@router.get("/me")
def me(user: CurrentUser):
    from app.schemas.auth import UserPublic

    return UserPublic.model_validate(user)
