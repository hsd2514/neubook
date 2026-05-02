# Vitodoo Backend

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
