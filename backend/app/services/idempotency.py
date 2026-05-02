"""Idempotency-key support for booking creation.

Stores the outcome of a request keyed by (Idempotency-Key header, user_id).
Repeated requests with the same key return the cached response without
creating duplicate bookings. Records expire after EXPIRY_HOURS.
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.idempotency import IdempotencyRecord

EXPIRY_HOURS = 24
ENDPOINT_BOOKING_CREATE = "bookings:create"


def cleanup_expired(db: Session) -> None:
    """Delete idempotency records past their expiry."""
    db.execute(
        delete(IdempotencyRecord).where(IdempotencyRecord.expires_at < datetime.now(timezone.utc))
    )
    db.commit()


def find_record(db: Session, key: str, user_id: int, endpoint: str) -> IdempotencyRecord | None:
    """Return a non-expired record for the given key+user+endpoint, or None."""
    now = datetime.now(timezone.utc)
    return db.execute(
        select(IdempotencyRecord).where(
            IdempotencyRecord.key == key,
            IdempotencyRecord.user_id == user_id,
            IdempotencyRecord.endpoint == endpoint,
            IdempotencyRecord.expires_at > now,
        )
    ).scalar_one_or_none()


def store_record(
    db: Session,
    key: str,
    user_id: int,
    endpoint: str,
    status_code: int,
    response_body: dict,
    booking_id: int | None = None,
) -> IdempotencyRecord:
    """Persist the outcome of a request for future replay."""
    record = IdempotencyRecord(
        key=key,
        user_id=user_id,
        endpoint=endpoint,
        status_code=status_code,
        response_body=response_body,
        booking_id=booking_id,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=EXPIRY_HOURS),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
