from fastapi.testclient import TestClient
from app.main import app
from app.models.user import User
from app.database import SessionLocal
from unittest.mock import patch, MagicMock
from app.routers.auth import get_current_user

db = SessionLocal()
user = db.query(User).filter(User.email == "test@example.com").first()

client = TestClient(app)
app.dependency_overrides[get_current_user] = lambda: user

with patch("app.routers.integrations._get_google_flow") as mock_flow:
    mock_flow_instance = MagicMock()
    mock_flow_instance.authorization_url.return_value = ("http://mock-auth-url.com", "mock_state")
    mock_flow.return_value = mock_flow_instance
    response = client.get("/api/v1/integrations/google-drive/auth-url")
    print("STATUS", response.status_code)
    print("BODY", response.json())
