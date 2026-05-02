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
