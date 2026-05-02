from app.models.user import User
from app.utils.jwt import create_access_token
from app.utils.password import hash_password


def _organiser_auth_header(db_session):
    organiser = User(
        full_name="Org",
        email="org-share@example.com",
        password_hash=hash_password("password123"),
        role="organiser",
        is_active=True,
    )
    db_session.add(organiser)
    db_session.commit()
    token = create_access_token(organiser.id, {"role": organiser.role})
    return {"Authorization": f"Bearer {token}"}


def test_unpublished_appointment_hidden_from_public_but_available_by_share(client, db_session):
    headers = _organiser_auth_header(db_session)
    create = client.post(
        "/api/appointments/mine",
        json={
            "name": "Confidential Consult",
            "description": "Invite-only booking",
            "duration_minutes": 30,
            "appointment_kind": "resource",
            "slot_schedule": "weekly",
            "is_published": False,
            "manage_capacity": False,
            "advance_payment": False,
            "manual_confirmation": False,
            "assignment_mode": "manual",
            "max_bookings_per_slot": 1,
        },
        headers=headers,
    )
    assert create.status_code == 200
    created = create.json()
    assert created["share_link"]

    public = client.get("/api/appointments/public")
    assert public.status_code == 200
    assert all(row["id"] != created["id"] for row in public.json())

    by_share = client.get(f"/api/appointments/by-share/{created['share_link']}")
    assert by_share.status_code == 200
    body = by_share.json()
    assert body["id"] == created["id"]
    assert body["share_link"] == created["share_link"]


def test_get_by_share_returns_404_for_invalid_token(client):
    r = client.get("/api/appointments/by-share/not-a-valid-token")
    assert r.status_code == 404
