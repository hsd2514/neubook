from sqlalchemy import select

from app.models.auth_tokens import EmailOTP
from app.models.user import User
from app.utils.jwt import create_access_token
from app.utils.password import hash_password


def test_signup_verify_login(client, db_session):
    r = client.post(
        "/api/auth/signup",
        json={"full_name": "Test User", "email": "t@example.com", "password": "password123"},
    )
    assert r.status_code == 200

    row = db_session.execute(select(EmailOTP).where(EmailOTP.email == "t@example.com")).scalar_one()
    code = row.code

    r2 = client.post("/api/auth/verify-otp", json={"email": "t@example.com", "code": code})
    assert r2.status_code == 200
    data = r2.json()
    assert "access_token" in data

    r3 = client.post("/api/auth/login", json={"email": "t@example.com", "password": "password123"})
    assert r3.status_code == 200


def test_admin_me(client, db_session):
    u = User(
        full_name="Admin",
        email="a@example.com",
        password_hash=hash_password("adminpass1"),
        role="admin",
        is_active=True,
    )
    db_session.add(u)
    db_session.commit()

    token = create_access_token(u.id, {"role": u.role})
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["role"] == "admin"
