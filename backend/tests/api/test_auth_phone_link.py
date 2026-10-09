import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.models.user import User
from app.security import create_access_token
from unittest.mock import patch, MagicMock
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
def mock_twilio():
    with patch("app.routers.auth.TwilioClient") as mock, \
         patch("app.routers.auth.settings.twilio_account_sid", "mock_sid"), \
         patch("app.routers.auth.settings.twilio_auth_token", "mock_token"), \
         patch("app.routers.auth.settings.twilio_verify_service_sid", "mock_vsid"):
        client_instance = MagicMock()
        mock.return_value = client_instance
        yield client_instance

@pytest.fixture
def auth_headers():
    token = create_access_token(data={"sub": "999", "email": "test@example.com", "role": "viewer"}, expires_delta=timedelta(minutes=30))
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def setup_user(db: Session):
    db.query(User).filter(User.id == 999).delete()
    db.query(User).filter(User.email.in_(["test@example.com", "other@example.com", "other2@example.com"])).delete()
    db.query(User).filter(User.phone_number.in_(["+14155552679", "+14155552672", "+14155552673", "+14155552674"])).delete()
    db.commit()
    user = User(id=999, email="test@example.com", is_active=True)
    db.add(user)
    db.commit()
    yield user
    user_to_delete = db.query(User).filter(User.id == 999).first()
    if user_to_delete:
        db.delete(user_to_delete)
    db.query(User).filter(User.email.in_(["other@example.com", "other2@example.com"])).delete()
    db.query(User).filter(User.phone_number.in_(["+14155552679", "+14155552672", "+14155552673", "+14155552674"])).delete()
    db.commit()

def test_link_send_unauthenticated(client):
    response = client.post("/api/v1/auth/phone/link/send", json={"phone_number": "+14155552671"})
    assert response.status_code == 401

def test_link_verify_unauthenticated(client):
    response = client.post("/api/v1/auth/phone/link/verify", json={"phone_number": "+14155552671", "code": "123456"})
    assert response.status_code == 401

def test_link_send_success(client, auth_headers, setup_user, mock_twilio):
    response = client.post("/api/v1/auth/phone/link/send", json={"phone_number": "+14155552671"}, headers=auth_headers)
    assert response.status_code == 200
    mock_twilio.verify.v2.services().verifications.create.assert_called_once_with(
        to="+14155552671", channel="sms"
    )

def test_link_send_conflict(client, auth_headers, setup_user, db: Session):
    other_user = User(email="other@example.com", phone_number="+14155552679", is_active=True)
    db.add(other_user)
    db.commit()
    
    response = client.post("/api/v1/auth/phone/link/send", json={"phone_number": "+14155552679"}, headers=auth_headers)
    assert response.status_code == 409

def test_link_verify_success(client, auth_headers, setup_user, mock_twilio, db: Session):
    mock_check = MagicMock()
    mock_check.status = "approved"
    mock_twilio.verify.v2.services().verification_checks.create.return_value = mock_check
    
    response = client.post("/api/v1/auth/phone/link/verify", json={"phone_number": "+14155552672", "code": "123456"}, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["message"] == "Phone number successfully linked."
    
    db.refresh(setup_user)
    assert setup_user.phone_number == "+14155552672"

def test_link_verify_conflict(client, auth_headers, setup_user, db: Session):
    other_user = User(email="other2@example.com", phone_number="+14155552673", is_active=True)
    db.add(other_user)
    db.commit()
    
    response = client.post("/api/v1/auth/phone/link/verify", json={"phone_number": "+14155552673", "code": "123456"}, headers=auth_headers)
    assert response.status_code == 409
    
    db.refresh(setup_user)
    assert setup_user.phone_number != "+14155552673"

def test_link_verify_idempotent(client, auth_headers, setup_user, mock_twilio, db: Session):
    setup_user.phone_number = "+14155552674"
    db.commit()
    
    response = client.post("/api/v1/auth/phone/link/verify", json={"phone_number": "+14155552674", "code": "123456"}, headers=auth_headers)
    assert response.status_code == 200
    
    # Twilio verify should not even be called if it's already linked to this user
    mock_twilio.verify.v2.services().verification_checks.create.assert_not_called()
