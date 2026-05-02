"""Seed the database with test users for each role.

Usage:
    uv run python seed.py
"""

from sqlalchemy import select

from app.database import SessionLocal, engine, Base
from app.models.user import User
from app.utils.password import hash_password

Base.metadata.create_all(bind=engine)

USERS = [
    {"full_name": "Alice Customer", "email": "customer@test.com", "password": "test1234", "role": "customer"},
    {"full_name": "Bob Organiser", "email": "organiser@test.com", "password": "test1234", "role": "organiser"},
    {"full_name": "Charlie Admin", "email": "admin@test.com", "password": "test1234", "role": "admin"},
]

def seed():
    db = SessionLocal()
    try:
        for u in USERS:
            exists = db.execute(select(User).where(User.email == u["email"])).scalar_one_or_none()
            if exists:
                print(f"  skip  {u['email']} (already exists)")
                continue
            db.add(User(
                full_name=u["full_name"],
                email=u["email"],
                password_hash=hash_password(u["password"]),
                role=u["role"],
                is_active=True,
            ))
            print(f"  added {u['email']} [{u['role']}]")
        db.commit()
        print("\nDone! Test accounts:\n")
        for u in USERS:
            print(f"  {u['role']:12} {u['email']:24} password: {u['password']}")
        print()
    finally:
        db.close()

if __name__ == "__main__":
    seed()
