# Neubook Backend

FastAPI + SQLAlchemy + Alembic + PostgreSQL.

## Setup (uv)

```bash
cd backend
uv sync
cp .env.example .env
# Edit .env with your DATABASE_URL
# If using Upstash Redis for booking locks, set UPSTASH_REDIS_URL
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Redis/Upstash Locking

Booking concurrency locks use Redis when configured. If no Redis URL is set,
the app falls back to an in-process lock (fine for local dev, not enough for multi-instance production).

Set one of:

- `UPSTASH_REDIS_URL=rediss://default:<password>@<host>:<port>`
- `REDIS_URL=redis://localhost:6379/0`

Optional:

- `SLOT_LOCK_TTL_SECONDS=10`

## Tests

```bash
uv run pytest
```

## Booking lifecycle

Booking status transitions are:

- `pending` -> `confirmed` (organiser/admin via `POST /api/bookings/{booking_id}/confirm`)
- `confirmed` -> `completed` (organiser/admin via `POST /api/bookings/{booking_id}/complete`)
- `pending|confirmed` -> `cancelled` (customer owner, organiser owner, or admin via `POST /api/bookings/{booking_id}/cancel`)

Capacity and availability checks only consider active bookings (`pending`, `confirmed`).
