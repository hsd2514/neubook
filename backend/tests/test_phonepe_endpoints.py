from app.models.user import User
from app.utils.jwt import create_access_token
from app.utils.password import hash_password


def _auth_header(user: User) -> dict[str, str]:
    token = create_access_token(user.id, {"role": user.role})
    return {"Authorization": f"Bearer {token}"}


def _create_user(db_session, email: str, role: str) -> User:
    user = User(
        full_name=f"{role.title()} User",
        email=email,
        password_hash=hash_password("password123"),
        role=role,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_phonepe_initiate_returns_503_when_not_configured(client, db_session):
    customer = _create_user(db_session, "phonepe_customer@example.com", "customer")
    payload = {
        "amount_paisa": 100,
        "redirect_url": "https://example.com/phonepe/redirect",
    }
    resp = client.post(
        "/api/bookings/payments/phonepe/initiate",
        json=payload,
        headers=_auth_header(customer),
    )
    assert resp.status_code == 503
    assert "PhonePe credentials are not configured" in resp.json()["detail"]


def test_phonepe_status_returns_503_when_not_configured(client, db_session):
    customer = _create_user(db_session, "phonepe_customer2@example.com", "customer")
    payload = {"merchant_order_id": "order_123"}
    resp = client.post(
        "/api/bookings/payments/phonepe/status",
        json=payload,
        headers=_auth_header(customer),
    )
    assert resp.status_code == 503
    assert "PhonePe credentials are not configured" in resp.json()["detail"]
