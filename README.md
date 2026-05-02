# Neubook

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

- Signup → OTP by email (falls back to server console when SMTP is not configured) → verify → JWT.
- Forgot password → reset link by email (falls back to server console when SMTP is not configured).

## Email (Google SMTP)

Set these in `backend/.env`:

- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=587`
- `SMTP_USERNAME=<your-gmail>`
- `SMTP_PASSWORD=<google-app-password>`
- `SMTP_FROM_EMAIL=<your-gmail>`
- `SMTP_FROM_NAME=Neubook`
- `SMTP_USE_TLS=true`
- `FRONTEND_BASE_URL=http://localhost:5173`

## Stack reference

See [guide/guide.md](guide/guide.md).
