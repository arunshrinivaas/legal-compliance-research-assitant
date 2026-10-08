import pytest
from unittest.mock import AsyncMock, patch
import time

from fastapi.testclient import TestClient

from app.main import app
from app.models.user import User
from app.routers import auth
from app.routers.auth import _email_otp_state, _email_send_timestamps, _ip_send_timestamps
from app.database import SessionLocal

client = TestClient(app)

@pytest.fixture
def db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(autouse=True)
def reset_rate_limits_and_state():
    _email_otp_state.clear()
    _email_send_timestamps.clear()
    _ip_send_timestamps.clear()
    yield

def test_send_email_otp_success(db):
    with patch("app.routers.auth.EmailService.send_otp", new_callable=AsyncMock) as mock_send:
        response = client.post(
            "/api/v1/auth/email-otp/send",
            json={"email": "test@example.com"}
        )
        assert response.status_code == 200
        assert response.json() == {"message": "Verification code requested."}
        
        mock_send.assert_called_once()
        args, _ = mock_send.call_args
        assert args[0] == "test@example.com"
        assert len(args[1]) == 6
        assert args[1].isdigit()
        
        assert "test@example.com" in _email_otp_state

def test_send_email_otp_missing_config():
    with patch("app.routers.auth.EmailService.send_otp", new_callable=AsyncMock) as mock_send:
        mock_send.side_effect = ValueError("Missing config")
        response = client.post(
            "/api/v1/auth/email-otp/send",
            json={"email": "test@example.com"}
        )
        assert response.status_code == 503
        assert response.json()["detail"] == "Email authentication is not configured on this server."

def test_send_email_otp_delivery_failure():
    with patch("app.routers.auth.EmailService.send_otp", new_callable=AsyncMock) as mock_send:
        mock_send.side_effect = RuntimeError("SMTP Error")
        response = client.post(
            "/api/v1/auth/email-otp/send",
            json={"email": "test@example.com"}
        )
        assert response.status_code == 502
        assert response.json()["detail"] == "Failed to send verification code via email provider."

def test_send_email_otp_rate_limit_email():
    with patch("app.routers.auth.EmailService.send_otp", new_callable=AsyncMock):
        for _ in range(3):
            resp = client.post("/api/v1/auth/email-otp/send", json={"email": "limit@example.com"})
            assert resp.status_code == 200
            
        resp_429 = client.post("/api/v1/auth/email-otp/send", json={"email": "limit@example.com"})
        assert resp_429.status_code == 429

def test_send_email_otp_rate_limit_ip():
    with patch("app.routers.auth.EmailService.send_otp", new_callable=AsyncMock):
        for i in range(10):
            resp = client.post("/api/v1/auth/email-otp/send", json={"email": f"test{i}@example.com"})
            assert resp.status_code == 200
            
        resp_429 = client.post("/api/v1/auth/email-otp/send", json={"email": "test10@example.com"})
        assert resp_429.status_code == 429

def test_verify_email_otp_new_user(db):
    _email_otp_state["new@example.com"] = {
        "code": "123456",
        "expires_at": time.time() + 300,
        "attempts": 0
    }
    
    response = client.post(
        "/api/v1/auth/email-otp/verify",
        json={"email": "new@example.com", "code": "123456"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["mfa_required"] is False
    assert data["user"]["email"] == "new@example.com"
    
    assert "new@example.com" not in _email_otp_state
    
    # Check DB
    user = db.query(User).filter(User.email == "new@example.com").first()
    assert user is not None
    assert user.email_verified is True
    assert user.password_hash is None
    assert user.role == "viewer"

def test_verify_email_otp_existing_user(db):
    user = User(
        email="existing_otp@example.com",
        password_hash="fakehash",
        role="viewer",
        is_active=True,
        email_verified=False
    )
    db.add(user)
    db.commit()
    
    _email_otp_state["existing_otp@example.com"] = {
        "code": "654321",
        "expires_at": time.time() + 300,
        "attempts": 0
    }
    
    response = client.post(
        "/api/v1/auth/email-otp/verify",
        json={"email": "existing_otp@example.com", "code": "654321"}
    )
    assert response.status_code == 200
    
    db.refresh(user)
    assert user.email_verified is True
    assert user.password_hash == "fakehash"

def test_verify_email_otp_invalid_code(db):
    _email_otp_state["wrong@example.com"] = {
        "code": "123456",
        "expires_at": time.time() + 300,
        "attempts": 0
    }
    
    response = client.post(
        "/api/v1/auth/email-otp/verify",
        json={"email": "wrong@example.com", "code": "999999"}
    )
    assert response.status_code == 401
    
    assert _email_otp_state["wrong@example.com"]["attempts"] == 1

def test_verify_email_otp_max_attempts(db):
    _email_otp_state["max@example.com"] = {
        "code": "123456",
        "expires_at": time.time() + 300,
        "attempts": 2
    }
    
    response = client.post(
        "/api/v1/auth/email-otp/verify",
        json={"email": "max@example.com", "code": "999999"}
    )
    assert response.status_code == 401
    
    assert "max@example.com" not in _email_otp_state

def test_verify_email_otp_expired(db):
    _email_otp_state["expired@example.com"] = {
        "code": "123456",
        "expires_at": time.time() - 100,
        "attempts": 0
    }
    
    response = client.post(
        "/api/v1/auth/email-otp/verify",
        json={"email": "expired@example.com", "code": "123456"}
    )
    assert response.status_code == 401
    assert "expired@example.com" not in _email_otp_state

def test_verify_email_otp_with_mfa(db):
    user = User(
        email="mfa_otp@example.com",
        password_hash="fakehash",
        role="viewer",
        is_active=True,
        email_verified=True,
        mfa_enabled=True,
        totp_secret="SOMESECRET"
    )
    db.add(user)
    db.commit()
    
    _email_otp_state["mfa_otp@example.com"] = {
        "code": "111111",
        "expires_at": time.time() + 300,
        "attempts": 0
    }
    
    response = client.post(
        "/api/v1/auth/email-otp/verify",
        json={"email": "mfa_otp@example.com", "code": "111111"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["mfa_required"] is True
    assert "mfa_token" in data
    assert "access_token" not in data

def test_verify_email_otp_disabled_account(db):
    user = User(
        email="disabled_otp@example.com",
        password_hash=None,
        role="viewer",
        is_active=False,
        email_verified=True
    )
    db.add(user)
    db.commit()
    
    _email_otp_state["disabled_otp@example.com"] = {
        "code": "222222",
        "expires_at": time.time() + 300,
        "attempts": 0
    }
    
    response = client.post(
        "/api/v1/auth/email-otp/verify",
        json={"email": "disabled_otp@example.com", "code": "222222"}
    )
    assert response.status_code == 403
