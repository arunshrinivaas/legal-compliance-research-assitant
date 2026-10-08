import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.models.user import User
from app.models.document import Document
from app.security import create_access_token
from datetime import timedelta
from app.database import SessionLocal
from app.config import settings

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
def setup_users(db: Session):
    db.query(User).filter(User.id.in_([998, 999])).delete()
    db.commit()
    userA = User(id=999, email="userA@example.com", is_active=True)
    userB = User(id=998, email="userB@example.com", is_active=True)
    db.add(userA)
    db.add(userB)
    db.commit()
    
    yield (userA, userB)
    
    db.query(Document).filter(Document.user_id.in_([998, 999])).delete()
    db.query(User).filter(User.id.in_([998, 999])).delete()
    db.commit()

def create_mock_file(filename: str, hash_val: str):
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / f"{hash_val}_{filename}"
    file_path.write_text("mock content")
    return file_path

def get_auth_headers(user_id: int):
    token = create_access_token(data={"sub": str(user_id), "email": "test@example.com", "role": "viewer"}, expires_delta=timedelta(minutes=30))
    return {"Authorization": f"Bearer {token}"}

def test_delete_single_document_removes_file(client, db, setup_users):
    userA, _ = setup_users
    hash_val = "testhash1"
    filename = "testfile1.pdf"
    file_path = create_mock_file(filename, hash_val)
    
    doc = Document(title="test", filename=filename, file_hash=hash_val, document_type="PDF", jurisdiction="Unknown", user_id=userA.id)
    db.add(doc)
    db.commit()
    
    response = client.delete(f"/api/v1/documents/{doc.id}", headers=get_auth_headers(userA.id))
    assert response.status_code == 204
    
    # physical file should be removed
    assert not file_path.exists()
    assert db.query(Document).filter(Document.id == doc.id).first() is None

def test_shared_physical_file_preserves_on_partial_delete(client, db, setup_users):
    userA, userB = setup_users
    hash_val = "testhash_shared"
    filename = "sharedfile.pdf"
    file_path = create_mock_file(filename, hash_val)
    
    docA = Document(title="test A", filename=filename, file_hash=hash_val, document_type="PDF", jurisdiction="Unknown", user_id=userA.id)
    docB = Document(title="test B", filename=filename, file_hash=hash_val, document_type="PDF", jurisdiction="Unknown", user_id=userB.id)
    db.add(docA)
    db.add(docB)
    db.commit()
    
    # User A deletes their document
    response = client.delete(f"/api/v1/documents/{docA.id}", headers=get_auth_headers(userA.id))
    assert response.status_code == 204
    
    # docA is removed, docB remains
    assert db.query(Document).filter(Document.id == docA.id).first() is None
    assert db.query(Document).filter(Document.id == docB.id).first() is not None
    
    # physical file MUST still exist because User B needs it
    assert file_path.exists()
    
    # User B deletes their document (Final owner)
    response = client.delete(f"/api/v1/documents/{docB.id}", headers=get_auth_headers(userB.id))
    assert response.status_code == 204
    
    assert db.query(Document).filter(Document.id == docB.id).first() is None
    
    # physical file should be removed now
    assert not file_path.exists()

def test_user_cannot_delete_other_user_document(client, db, setup_users):
    userA, userB = setup_users
    hash_val = "testhash_owner"
    filename = "owner.pdf"
    file_path = create_mock_file(filename, hash_val)
    
    docB = Document(title="test B", filename=filename, file_hash=hash_val, document_type="PDF", jurisdiction="Unknown", user_id=userB.id)
    db.add(docB)
    db.commit()
    
    # User A tries to delete User B's document
    response = client.delete(f"/api/v1/documents/{docB.id}", headers=get_auth_headers(userA.id))
    assert response.status_code == 404
    
    assert db.query(Document).filter(Document.id == docB.id).first() is not None
    assert file_path.exists()
    
    # cleanup
    file_path.unlink()
