import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from app.main import app
from app.models.user import User
from app.models.integration import Integration

from app.database import SessionLocal
from app.routers.auth import get_current_user

client = TestClient(app)

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def test_user(db_session):
    user = db_session.query(User).filter(User.email == "test@example.com").first()
    if not user:
        user = User(email="test@example.com", is_active=True, role="viewer")
        db_session.add(user)
        db_session.commit()
    return user

@pytest.fixture(autouse=True)
def override_get_current_user(test_user):
    app.dependency_overrides[get_current_user] = lambda: test_user
    yield
    app.dependency_overrides.clear()

def test_auth_url_unauthenticated():
    app.dependency_overrides.clear()
    response = client.get("/api/v1/integrations/google-drive/auth-url")
    assert response.status_code == 401

def test_auth_url_authenticated():
    with patch("app.routers.integrations._get_google_flow") as mock_flow, \
         patch("app.routers.integrations.settings") as mock_settings:
        mock_settings.google_client_id = "test_client_id"
        mock_settings.google_client_secret = "test_client_secret"
        
        mock_flow_instance = MagicMock()
        mock_flow_instance.authorization_url.return_value = ("http://mock-auth-url.com", "mock_state")
        mock_flow.return_value = mock_flow_instance
        
        response = client.get("/api/v1/integrations/google-drive/auth-url")
        assert response.status_code == 200
        assert "auth_url" in response.json()
        assert "state" in response.json()

def test_invalid_oauth_state():
    response = client.post(
        "/api/v1/integrations/google-drive/callback",
        json={"code": "mock_code", "state": "bad_state"}
    )
    assert response.status_code == 400
    assert "Invalid, expired, or reused state" in response.json()["detail"]

def test_callback_success(db_session):
    with patch("app.routers.integrations._get_google_flow") as mock_flow, \
         patch("app.routers.integrations.encrypt_token", return_value="encrypted_refresh_token") as _, \
         patch("google.oauth2.id_token.verify_oauth2_token", return_value={"email": "test@example.com"}):
        
        mock_flow_instance = MagicMock()
        mock_flow_instance.credentials.token = "access123"
        mock_flow_instance.credentials.refresh_token = "refresh123"
        mock_flow_instance.credentials.expiry = None
        mock_flow_instance.credentials.scopes = ["https://www.googleapis.com/auth/drive.file"]
        mock_flow.return_value = mock_flow_instance
        
        # Inject state into the server's state dictionary
        import app.routers.integrations as int_router
        from datetime import datetime, timedelta
        
        user = db_session.query(User).filter(User.email == "test@example.com").first()
        int_router._oauth_states["good_state"] = {
            "user_id": user.id,
            "expires_at": datetime.utcnow() + timedelta(minutes=10)
        }
        
        response = client.post(
            "/api/v1/integrations/google-drive/callback",
            json={"code": "mock_code", "state": "good_state"}
        )
        assert response.status_code == 200
        assert response.json()["connected_account"] == "test@example.com"
        
        integration = db_session.query(Integration).first()
        assert integration is not None
        assert integration.provider == "google_drive"
        assert integration.access_token == "access123"
        assert integration.refresh_token_encrypted == "encrypted_refresh_token"

def test_disconnect_integration(db_session):
    response = client.delete("/api/v1/integrations/google-drive")
    assert response.status_code == 200
    integration = db_session.query(Integration).first()
    assert integration is None

def test_import_unauthenticated():
    app.dependency_overrides.clear()
    response = client.post("/api/v1/integrations/google-drive/import", json={"file_id": "123"})
    assert response.status_code == 401

def test_import_missing_integration():
    response = client.post(
        "/api/v1/integrations/google-drive/import",
        json={"file_id": "123"}
    )
    assert response.status_code == 401
    assert "not connected" in response.json()["detail"]
