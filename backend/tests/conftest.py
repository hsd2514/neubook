import os

# Force test DB before application modules load settings/engine.
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret"
os.environ["REDIS_URL"] = ""
os.environ["UPSTASH_REDIS_URL"] = ""
os.environ.pop("PHONEPE_CLIENT_ID", None)
os.environ.pop("PHONEPE_CLIENT_SECRET", None)
os.environ.pop("PHONEPE_CLIENT_VERSION", None)
os.environ.pop("PHONEPE_CALLBACK_USERNAME", None)
os.environ.pop("PHONEPE_CALLBACK_PASSWORD", None)

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db_session):
    def _get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
