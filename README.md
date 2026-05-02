# Vitodoo

Appointment booking platform: **React + Vite + Tailwind** frontend (Odoo-style UI), **FastAPI + SQLAlchemy + Alembic + PostgreSQL** backend, **`uv`** for Python.

## Prerequisites

- Node 18+
- PostgreSQL (or adjust `DATABASE_URL`)
- [uv](https://docs.astral.sh/uv/) for Python

## Backend

```bash
cd backend
uv sync
cp .env.example .env
# set DATABASE_URL, SECRET_KEY
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Tests:** `uv run pytest`

**First admin (after signup):** verify OTP, then update your user in DB `role='admin'` or use another admin account to PATCH `/api/users/{id}` with `{"role":"organiser"}` for organisers.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite proxies `/api` to `http://127.0.0.1:8000`. For a different API origin, set `VITE_API_URL` (e.g. `http://localhost:8000`).

## Auth flows

- Signup → OTP in **server console** (dev) → verify → JWT.
- Forgot password → token in **server console** (dev) → reset form.

## Stack reference

See [guide/guide.md](guide/guide.md).
