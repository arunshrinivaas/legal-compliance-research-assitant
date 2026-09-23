import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import get_db
from app.models.base import Base
from app.models.user import User
from app.models.investigation import Investigation
from app.models.document import Document
from app.models.investigation_document import InvestigationDocument

# Use an in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

from sqlalchemy.pool import StaticPool

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

from datetime import datetime

@pytest.fixture
def test_db():
    db = TestingSessionLocal()
    try:
        # Clear existing
        db.query(InvestigationDocument).delete()
        db.query(Investigation).delete()
        db.query(Document).delete()
        db.query(User).delete()
        
        now = datetime.utcnow()
        
        # Create user 1 (owner)
        user1 = User(email="owner@test.com", password_hash="hash", full_name="Owner", is_active=True, created_at=now, updated_at=now)
        db.add(user1)
        
        # Create user 2 (non-owner)
        user2 = User(email="nonowner@test.com", password_hash="hash", full_name="Non Owner", is_active=True, created_at=now, updated_at=now)
        db.add(user2)
        
        db.commit()
        db.refresh(user1)
        db.refresh(user2)
        
        yield db
    finally:
        db.close()

from app.routers.auth import get_current_user

from fastapi import Depends

def set_current_user(user_id: int):
    def override_get_current_user(db=Depends(override_get_db)):
        return db.query(User).filter(User.id == user_id).first()
    app.dependency_overrides[get_current_user] = override_get_current_user


def test_investigation_lifecycle(test_db):
    user1 = test_db.query(User).filter(User.email == "owner@test.com").first()
    user2 = test_db.query(User).filter(User.email == "nonowner@test.com").first()

    set_current_user(user1.id)

    # Create investigation
    res = client.post("/api/v1/investigations/", json={"title": "Test Inv", "description": "Desc"})
    assert res.status_code == 201
    inv_id = res.json()["id"]

    # 1. owner can edit investigation
    res = client.patch(f"/api/v1/investigations/{inv_id}", json={"title": "Edited Inv", "description": "Edited Desc"})
    assert res.status_code == 200
    assert res.json()["title"] == "Edited Inv"

    # 2. non-owner cannot edit
    set_current_user(user2.id)
    res = client.patch(f"/api/v1/investigations/{inv_id}", json={"title": "Hacked Inv", "description": "Desc"})
    assert res.status_code == 404

    # 4. non-owner cannot archive
    res = client.patch(f"/api/v1/investigations/{inv_id}/status", json={"status": "Archived"})
    assert res.status_code == 404

    # 3. owner can archive
    set_current_user(user1.id)
    res = client.patch(f"/api/v1/investigations/{inv_id}/status", json={"status": "Archived"})
    assert res.status_code == 200
    assert res.json()["status"] == "Archived"

    # 9. archived investigations are excluded from active list (if we fetch ?status=Active)
    res = client.get("/api/v1/investigations/?status=Active")
    assert res.status_code == 200
    assert len(res.json()) == 0

    # 10. archived investigations appear in archive list
    res = client.get("/api/v1/investigations/?status=Archived")
    assert res.status_code == 200
    assert len(res.json()) == 1

    # 11. invalid status is rejected
    res = client.patch(f"/api/v1/investigations/{inv_id}/status", json={"status": "Deleted"})
    assert res.status_code == 422 # Pydantic validation error

    # 5. owner can restore
    res = client.patch(f"/api/v1/investigations/{inv_id}/status", json={"status": "Active"})
    assert res.status_code == 200
    assert res.json()["status"] == "Active"

    # Attach a document to test cascade
    doc = Document(title="Test Doc", filename="test.pdf", file_hash="123", document_type="PDF", jurisdiction="US", user_id=user1.id, uploaded_at=datetime.utcnow())
    test_db.add(doc)
    test_db.commit()
    test_db.refresh(doc)
    
    test_db.add(InvestigationDocument(investigation_id=inv_id, document_id=doc.id))
    test_db.commit()

    # 7. non-owner cannot delete
    set_current_user(user2.id)
    res = client.delete(f"/api/v1/investigations/{inv_id}")
    assert res.status_code == 404

    # 6. owner can delete
    set_current_user(user1.id)
    res = client.delete(f"/api/v1/investigations/{inv_id}")
    assert res.status_code == 204

    # 8. deleting investigation does not delete Document records
    inv_doc_count = test_db.query(InvestigationDocument).filter(InvestigationDocument.investigation_id == inv_id).count()
    assert inv_doc_count == 0
    doc_count = test_db.query(Document).filter(Document.id == doc.id).count()
    assert doc_count == 1
