import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.models.user import User
from unittest.mock import patch, MagicMock

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
def mock_twilio():
    with patch("app.routers.auth.TwilioClient") as mock:
        client_instance = MagicMock()
        mock.return_value = client_instance
        yield client_instance

def test_send_invalid_phone(client):
    response = client.post("/api/v1/auth/phone/send", json={"phone_number": "invalid"})
    assert response.status_code == 422
    assert "Invalid phone number format" in response.text

def test_send_missing_twilio_config(client):
    with patch("app.routers.auth.settings") as mock_settings:
        mock_settings.twilio_account_sid = ""
        response = client.post("/api/v1/auth/phone/send", json={"phone_number": "+14155552671"})
        assert response.status_code == 503

def test_send_success(client, mock_twilio):
    response = client.post("/api/v1/auth/phone/send", json={"phone_number": "+14155552671"})
    assert response.status_code == 200
    mock_twilio.verify.v2.services().verifications.create.assert_called_once_with(
        to="+14155552671", channel="sms"
    )

def test_verify_success_new_user(client, mock_twilio, db: Session):
    mock_check = MagicMock()
    mock_check.status = "approved"
    mock_twilio.verify.v2.services().verification_checks.create.return_value = mock_check
    
    response = client.post("/api/v1/auth/phone/verify", json={
        "phone_number": "+14155552672",
        "code": "123456"
    })
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["mfa_required"] is False
    
    user = db.query(User).filter(User.phone_number == "+14155552672").first()
    assert user is not None
    assert user.email is None

def test_verify_success_existing_user_totp(client, mock_twilio, db: Session):
    db.query(User).filter(User.email == "phone_totp@example.com").delete()
    db.commit()
    user = User(
        email="phone_totp@example.com",
        password_hash=None,
        phone_number="+14155552673",
        mfa_enabled=True,
        totp_secret="SECRET",
        is_active=True
    )
    db.add(user)
    db.commit()

    mock_check = MagicMock()
    mock_check.status = "approved"
    mock_twilio.verify.v2.services().verification_checks.create.return_value = mock_check
    
    response = client.post("/api/v1/auth/phone/verify", json={
        "phone_number": "+14155552673",
        "code": "123456"
    })
    
    assert response.status_code == 200
    data = response.json()
    assert data["mfa_required"] is True
    assert "mfa_token" in data

def test_verify_invalid_code(client, mock_twilio):
    mock_check = MagicMock()
    mock_check.status = "pending"
    mock_twilio.verify.v2.services().verification_checks.create.return_value = mock_check
    
    response = client.post("/api/v1/auth/phone/verify", json={
        "phone_number": "+14155552674",
        "code": "000000"
    })
    
    assert response.status_code == 401

def test_rate_limiting(client, mock_twilio):
    phone = "+14155552675"
    for _ in range(3):
        res = client.post("/api/v1/auth/phone/send", json={"phone_number": phone})
        assert res.status_code == 200
        
    res4 = client.post("/api/v1/auth/phone/send", json={"phone_number": phone})
    assert res4.status_code == 429
