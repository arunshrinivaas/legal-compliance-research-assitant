import requests
from app.config import settings

print(f"GOOGLE_CLIENT_ID loaded: {bool(settings.google_client_id)}")
print(f"GOOGLE_CLIENT_SECRET loaded: {bool(settings.google_client_secret)}")
print(f"OAUTH_ENCRYPTION_KEY loaded: {bool(settings.oauth_encryption_key)}")

from fastapi.testclient import TestClient
from app.main import app
from app.models.user import User
from app.database import SessionLocal
from app.routers.auth import get_current_user

db = SessionLocal()
user = db.query(User).filter(User.email == "test@example.com").first()
if not user:
    user = User(email="test@example.com", is_active=True, role="viewer")
    db.add(user)
    db.commit()

client = TestClient(app)
app.dependency_overrides[get_current_user] = lambda: user

response = client.get("/api/v1/integrations/google-drive/auth-url")
print(f"STATUS CODE: {response.status_code}")
if response.status_code != 200:
    print(f"ERROR: {response.json()}")

