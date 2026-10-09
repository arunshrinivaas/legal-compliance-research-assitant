import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import uuid
from app.main import app
from app.models.user import User
from app.models.investigation import Investigation
from app.routers.auth import create_access_token
from datetime import timedelta
from app.database import SessionLocal

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def test_user(db: Session):
    user = User(email=f"collab_owner_{uuid.uuid4().hex[:8]}@example.com", password_hash="hash", role="admin", is_active=True, email_verified=True)
    db.add(user)
    db.commit()
    return user

@pytest.fixture
def test_user_2(db: Session):
    user = User(email=f"collab_member_{uuid.uuid4().hex[:8]}@example.com", password_hash="hash", role="admin", is_active=True, email_verified=True)
    db.add(user)
    db.commit()
    return user

@pytest.fixture
def test_investigation(db: Session, test_user: User):
    inv = Investigation(title="Test Inv", user_id=test_user.id, status="open")
    db.add(inv)
    db.commit()
    return inv

def test_collaboration_auth(client: TestClient, db: Session, test_investigation: Investigation, test_user: User, test_user_2: User):
    owner_token = create_access_token({"sub": str(test_user.id), "role": "admin"})
    member_token = create_access_token({"sub": str(test_user_2.id), "role": "admin"})
    
    # Non-owner cannot add member
    res = client.post(f"/api/v1/investigations/{test_investigation.id}/collaborators", json={"user_id": 9999, "role": "editor"}, headers={"Authorization": f"Bearer {member_token}"})
    assert res.status_code == 403
    
    # Owner can add member
    res = client.post(f"/api/v1/investigations/{test_investigation.id}/collaborators", json={"user_id": test_user_2.id, "role": "viewer"}, headers={"Authorization": f"Bearer {owner_token}"})
    assert res.status_code == 200

def test_presence_api(client: TestClient, db: Session, test_investigation: Investigation, test_user: User):
    owner_token = create_access_token({"sub": str(test_user.id), "role": "admin"})
    
    # Post presence
    res = client.post(f"/api/v1/investigations/{test_investigation.id}/presence", headers={"Authorization": f"Bearer {owner_token}"})
    assert res.status_code == 200
    
    res = client.get(f"/api/v1/investigations/{test_investigation.id}/presence", headers={"Authorization": f"Bearer {owner_token}"})
    assert res.status_code == 200
    assert len(res.json()) >= 1

def test_share_finding_persistence(client: TestClient, db: Session, test_investigation: Investigation, test_user: User):
    owner_token = create_access_token({"sub": str(test_user.id), "role": "admin"})
    
    # Put investigation with finding
    res = client.post(f"/api/v1/knowledge/", json={
        "title": "New finding",
        "content": "This is a new finding content.",
        "source": f"Investigation ID: {test_investigation.id}"
    }, headers={"Authorization": f"Bearer {owner_token}"})
    assert res.status_code == 201
    
    # Check persistence
    data = res.json()
    assert data["title"] == "New finding"
    assert data["content"] == "This is a new finding content."



