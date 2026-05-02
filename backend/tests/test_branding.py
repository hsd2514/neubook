from app.models.user import User
from app.utils.jwt import create_access_token
from app.utils.password import hash_password


def _auth_header(user_id: int, role: str) -> dict[str, str]:
    token = create_access_token(user_id, {"role": role})
    return {"Authorization": f"Bearer {token}"}


def test_organiser_can_update_and_read_branding(client, db_session):
    organiser = User(
        full_name="Brand Org",
        email="brand-org@example.com",
        password_hash=hash_password("password123"),
        role="organiser",
        is_active=True,
    )
    db_session.add(organiser)
    db_session.commit()
    db_session.refresh(organiser)

    headers = _auth_header(organiser.id, organiser.role)

    patch = client.patch(
        "/api/users/me/branding",
        json={
            "brand_display_name": "Acme Clinic",
            "brand_logo_url": "https://example.com/logo.png",
            "brand_primary_color": "#123abc",
            "brand_accent_color": "#ff8800",
            "brand_theme": "dark",
            "brand_booking_domain": "book.acme.test",
        },
        headers=headers,
    )
    assert patch.status_code == 200
    body = patch.json()
    assert body["display_name"] == "Acme Clinic"
    assert body["logo_url"] == "https://example.com/logo.png"
    assert body["primary_color"] == "#123abc"
    assert body["accent_color"] == "#ff8800"
    assert body["theme"] == "dark"
    assert body["booking_domain"] == "book.acme.test"

    read = client.get(f"/api/users/{organiser.id}/branding")
    assert read.status_code == 200
    assert read.json()["display_name"] == "Acme Clinic"


def test_public_branding_defaults_to_user_name_when_display_name_missing(client, db_session):
    organiser = User(
        full_name="Fallback Name",
        email="fallback-org@example.com",
        password_hash=hash_password("password123"),
        role="organiser",
        is_active=True,
    )
    db_session.add(organiser)
    db_session.commit()
    db_session.refresh(organiser)

    read = client.get(f"/api/users/{organiser.id}/branding")
    assert read.status_code == 200
    body = read.json()
    assert body["display_name"] == "Fallback Name"
    assert body["primary_color"] == "#714b67"
    assert body["accent_color"] == "#006a68"
    assert body["theme"] == "light"


def test_customer_cannot_patch_branding(client, db_session):
    customer = User(
        full_name="Cust",
        email="cust-brand@example.com",
        password_hash=hash_password("password123"),
        role="customer",
        is_active=True,
    )
    db_session.add(customer)
    db_session.commit()
    db_session.refresh(customer)

    headers = _auth_header(customer.id, customer.role)
    r = client.patch("/api/users/me/branding", json={"brand_display_name": "Nope"}, headers=headers)
    assert r.status_code == 403
