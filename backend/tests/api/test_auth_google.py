import pytest
from unittest.mock import patch
import uuid

from fastapi.testclient import TestClient

from app.main import app
from app.models.user import User
from app.database import SessionLocal
from app.config import settings

client = TestClient(app)

@pytest.fixture
def db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_google_sign_in_missing_config():
    with patch("app.routers.auth.settings.google_client_id", ""):
        response = client.post("/api/v1/auth/google", json={"id_token": "dummy_token"})
        assert response.status_code == 503
        assert response.json()["detail"] == "Google Sign-In is not configured on this server."

@patch("app.routers.auth.google_id_token.verify_oauth2_token")
def test_google_sign_in_invalid_token(mock_verify):
    mock_verify.side_effect = ValueError("Invalid token")
    with patch("app.routers.auth.settings.google_client_id", "dummy_client_id"):
        response = client.post("/api/v1/auth/google", json={"id_token": "invalid_token"})
        assert response.status_code == 401
        assert response.json()["detail"] == "Google authentication failed. Please try again."

@patch("app.routers.auth.google_id_token.verify_oauth2_token")
def test_google_sign_in_unverified_email(mock_verify):
    mock_verify.return_value = {
        "email_verified": False,
        "sub": "12345",
        "email": "test@example.com",
    }
    with patch("app.routers.auth.settings.google_client_id", "dummy_client_id"):
        response = client.post("/api/v1/auth/google", json={"id_token": "valid_token"})
        assert response.status_code == 401
        assert response.json()["detail"] == "Google account email is not verified."

@patch("app.routers.auth.google_id_token.verify_oauth2_token")
def test_google_sign_in_new_user(mock_verify, db):
    test_email = f"google_new_{uuid.uuid4().hex[:8]}@example.com"
    mock_verify.return_value = {
        "email_verified": True,
        "sub": f"google_sub_{uuid.uuid4().hex[:8]}",
        "email": test_email,
        "name": "Google User"
    }
    with patch("app.routers.auth.settings.google_client_id", "dummy_client_id"):
        response = client.post("/api/v1/auth/google", json={"id_token": "valid_token"})
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == test_email
        assert data["user"]["full_name"] == "Google User"
        
        user = db.query(User).filter(User.email == test_email).first()
        assert user is not None
        assert user.google_id.startswith("google_sub_")

@patch("app.routers.auth.google_id_token.verify_oauth2_token")
def test_google_sign_in_existing_email(mock_verify, db):
    test_email = f"google_exist_{uuid.uuid4().hex[:8]}@example.com"
    user = User(
        email=test_email,
        password_hash="fakehash",
        role="viewer",
        is_active=True,
        email_verified=True
    )
    db.add(user)
    db.commit()

    mock_verify.return_value = {
        "email_verified": True,
        "sub": f"google_sub_{uuid.uuid4().hex[:8]}",
        "email": test_email,
        "name": "Google User"
    }
    with patch("app.routers.auth.settings.google_client_id", "dummy_client_id"):
        response = client.post("/api/v1/auth/google", json={"id_token": "valid_token"})
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["email"] == test_email
        
        db.refresh(user)
        assert user.google_id.startswith("google_sub_")

@patch("app.routers.auth.google_id_token.verify_oauth2_token")
def test_google_sign_in_conflict(mock_verify, db):
    test_email = f"google_conflict_{uuid.uuid4().hex[:8]}@example.com"
    user = User(
        email=test_email,
        password_hash="fakehash",
        role="viewer",
        is_active=True,
        email_verified=True,
        google_id=f"other_google_sub_{uuid.uuid4().hex[:8]}"
    )
    db.add(user)
    db.commit()

    mock_verify.return_value = {
        "email_verified": True,
        "sub": f"google_sub_{uuid.uuid4().hex[:8]}",
        "email": test_email,
    }
    with patch("app.routers.auth.settings.google_client_id", "dummy_client_id"):
        response = client.post("/api/v1/auth/google", json={"id_token": "valid_token"})
        assert response.status_code == 409
        assert response.json()["detail"] == "This email is already linked to a different Google account."
