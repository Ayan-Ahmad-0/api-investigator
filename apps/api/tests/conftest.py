import os
import sys
from pathlib import Path

# Add apps/api to sys.path so app imports work
api_path = Path(__file__).resolve().parent.parent
if str(api_path) not in sys.path:
    sys.path.insert(0, str(api_path))

# Add packages/python-sdk to sys.path
sdk_path = api_path.parent.parent / "packages" / "python-sdk"
if str(sdk_path) not in sys.path:
    sys.path.insert(0, str(sdk_path))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import create_access_token
from app.main import app
from app.models.user import User
from app.models.organization import Organization, Membership
from app.models.project import Project, Environment
from app.models.api_key import ApiKey
from app.services.api_key_service import create_api_key
from app.services.auth_service import register_user

# Test in-memory SQLite database
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db():
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db):
    user = register_user(db, email="engineer@test.com", name="Test Engineer", password="Password123!")
    return user


@pytest.fixture
def other_user(db):
    user = register_user(db, email="other@test.com", name="Other User", password="Password123!")
    return user


@pytest.fixture
def auth_headers(test_user):
    token = create_access_token(data={"sub": test_user.id, "email": test_user.email})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def other_auth_headers(other_user):
    token = create_access_token(data={"sub": other_user.id, "email": other_user.email})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_org(db, test_user):
    org = Organization(name="Acme Corp", slug="acme-corp")
    db.add(org)
    db.flush()
    mem = Membership(organization_id=org.id, user_id=test_user.id, role="owner")
    db.add(mem)
    db.commit()
    db.refresh(org)
    return org


@pytest.fixture
def test_project(db, test_org):
    project = Project(
        organization_id=test_org.id,
        name="Checkout API",
        slug="checkout-api",
        description="Core checkout and payments service",
    )
    db.add(project)
    db.flush()
    env = Environment(project_id=project.id, name="production")
    db.add(env)
    db.commit()
    db.refresh(project)
    return project


@pytest.fixture
def test_ingestion_key(db, test_project):
    api_key, full_key = create_api_key(db, test_project.id, name="Test Ingestion Key")
    return api_key, full_key
