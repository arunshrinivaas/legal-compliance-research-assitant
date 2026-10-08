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

response = client.get("/api/v1/integrations/google-drive/status")
print(f"Server returned: {response.status_code}")
print(f"Content: {response.json()}")
