import time
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import patch, MagicMock
from datetime import timedelta

from app.main import app
from app.routers.auth import _email_otp_state, _email_send_timestamps, _ip_send_timestamps
from app.models.user import User
from app.database import SessionLocal
from app.security import create_access_token

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

@pytest.fixture(autouse=True)
def reset_email_state():
    _email_otp_state.clear()
    _email_send_timestamps.clear()
    _ip_send_timestamps.clear()
    yield
    _email_otp_state.clear()
    _email_send_timestamps.clear()
    _ip_send_timestamps.clear()

@pytest.fixture
def auth_headers():
    token = create_access_token(data={"sub": "999", "email": "test@example.com", "role": "viewer"}, expires_delta=timedelta(minutes=30))
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def setup_user(db: Session):
    db.query(User).filter(User.id == 999).delete()
    db.query(User).filter(User.email.in_(["test@example.com", "other@example.com", "other2@example.com"])).delete()
    db.commit()
    user = User(id=999, email="test@example.com", is_active=True, email_verified=False)
    db.add(user)
    db.commit()
    yield user
    user_to_delete = db.query(User).filter(User.id == 999).first()
    if user_to_delete:
        db.delete(user_to_delete)
    db.query(User).filter(User.email.in_(["other@example.com", "other2@example.com"])).delete()
    db.commit()

def test_verify_account_send_unauthenticated(client):
    response = client.post("/api/v1/auth/email-otp/verify-account/send")
    assert response.status_code == 401

def test_verify_account_verify_unauthenticated(client):
    response = client.post("/api/v1/auth/email-otp/verify-account/verify", json={"code": "123456"})
    assert response.status_code == 401

def test_verify_account_send_no_email(client, db: Session, auth_headers, setup_user):
    setup_user.email = None
    db.commit()

    response = client.post("/api/v1/auth/email-otp/verify-account/send", headers=auth_headers)
    assert response.status_code == 400
    assert "No email" in response.json()["detail"]

    setup_user.email = "test@example.com"
    db.commit()

def test_verify_account_send_already_verified(client, db: Session, auth_headers, setup_user):
    setup_user.email_verified = True
    db.commit()

    response = client.post("/api/v1/auth/email-otp/verify-account/send", headers=auth_headers)
    assert response.status_code == 400
    assert "already verified" in response.json()["detail"]
    
    setup_user.email_verified = False
    db.commit()

@patch("app.routers.auth.EmailService.send_otp")
def test_verify_account_send_success(mock_send_otp, client, db: Session, auth_headers, setup_user):
    response = client.post("/api/v1/auth/email-otp/verify-account/send", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["message"] == "Verification code sent."
    mock_send_otp.assert_called_once()
    
    assert len(_email_send_timestamps["test@example.com"]) == 1
    assert "test@example.com" in _email_otp_state

@patch("app.routers.auth.EmailService.send_otp")
def test_verify_account_send_rate_limit(mock_send_otp, client, db: Session, auth_headers, setup_user):
    for _ in range(3):
        client.post("/api/v1/auth/email-otp/verify-account/send", headers=auth_headers)
    
    response = client.post("/api/v1/auth/email-otp/verify-account/send", headers=auth_headers)
    assert response.status_code == 429

def test_verify_account_verify_no_email(client, db: Session, auth_headers, setup_user):
    setup_user.email = None
    db.commit()

    response = client.post("/api/v1/auth/email-otp/verify-account/verify", headers=auth_headers, json={"code": "123456"})
    assert response.status_code == 400

    setup_user.email = "test@example.com"
    db.commit()

def test_verify_account_verify_already_verified(client, db: Session, auth_headers, setup_user):
    setup_user.email_verified = True
    db.commit()

    response = client.post("/api/v1/auth/email-otp/verify-account/verify", headers=auth_headers, json={"code": "123456"})
    assert response.status_code == 200
    assert "already verified" in response.json()["message"]

    setup_user.email_verified = False
    db.commit()

def test_verify_account_verify_invalid_code(client, db: Session, auth_headers, setup_user):
    _email_otp_state["test@example.com"] = {
        "code": "123456",
        "expires_at": time.time() + 300,
        "attempts": 0
    }
    
    response = client.post("/api/v1/auth/email-otp/verify-account/verify", headers=auth_headers, json={"code": "000000"})
    assert response.status_code == 401
    
    assert _email_otp_state["test@example.com"]["attempts"] == 1
    
    db.refresh(setup_user)
    assert not setup_user.email_verified

def test_verify_account_verify_max_attempts(client, db: Session, auth_headers, setup_user):
    _email_otp_state["test@example.com"] = {
        "code": "123456",
        "expires_at": time.time() + 300,
        "attempts": 2
    }
    
    response = client.post("/api/v1/auth/email-otp/verify-account/verify", headers=auth_headers, json={"code": "000000"})
    assert response.status_code == 401
    
    assert "test@example.com" not in _email_otp_state

def test_verify_account_verify_success(client, db: Session, auth_headers, setup_user):
    _email_otp_state["test@example.com"] = {
        "code": "123456",
        "expires_at": time.time() + 300,
        "attempts": 0
    }
    
    response = client.post("/api/v1/auth/email-otp/verify-account/verify", headers=auth_headers, json={"code": "123456"})
    assert response.status_code == 200
    assert response.json()["message"] == "Email verified successfully."
    
    assert "test@example.com" not in _email_otp_state
    
    assert "access_token" not in response.json()
    
    db.refresh(setup_user)
    assert setup_user.email_verified

def test_verify_account_account_isolation(client, db: Session, auth_headers, setup_user):
    other_user = User(
        email="other@example.com",
        password_hash=None,
        full_name=None,
        role="viewer",
        is_active=True,
        email_verified=False,
    )
    db.add(other_user)
    db.commit()
    
    _email_otp_state["other@example.com"] = {
        "code": "123456",
        "expires_at": time.time() + 300,
        "attempts": 0
    }
    
    response = client.post("/api/v1/auth/email-otp/verify-account/verify", headers=auth_headers, json={"code": "123456"})
    assert response.status_code == 401
    
    db.delete(other_user)
    db.commit()
