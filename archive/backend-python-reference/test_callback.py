from fastapi.testclient import TestClient
from app.main import app
from app.models.user import User
from app.database import SessionLocal
from app.routers.auth import get_current_user
import json

db = SessionLocal()
user = db.query(User).filter(User.email == "test@example.com").first()

client = TestClient(app)
app.dependency_overrides[get_current_user] = lambda: user

# 1. Get auth url (and state)
auth_resp = client.get("/api/v1/integrations/google-drive/auth-url")
state = auth_resp.json().get("state")
print("Got state:", state)

# 2. Call callback with invalid code
callback_resp = client.post(
    "/api/v1/integrations/google-drive/callback",
    json={"code": "invalid_code_123", "state": state, "expected_state": state}
)

print(f"Callback Status: {callback_resp.status_code}")
print(f"Callback Response: {callback_resp.json()}")
