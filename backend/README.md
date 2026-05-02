# Vitodoo Backend

FastAPI + SQLAlchemy + Alembic + PostgreSQL.

## Setup (uv)

```bash
cd backend
uv sync
cp .env.example .env
# Edit .env with your DATABASE_URL
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

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
