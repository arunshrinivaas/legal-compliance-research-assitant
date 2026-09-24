import asyncio
from datetime import timedelta
from app.database import SessionLocal
from app.models.user import User
from app.security import create_access_token
from app.config import settings
import requests

db = SessionLocal()
user = db.query(User).filter(User.email == "arun-test-001@example.com").first()
access_token = create_access_token(
    data={
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
    },
    expires_delta=timedelta(minutes=settings.jwt_access_token_expire_minutes),
)
db.close()

res = requests.post(
    "http://127.0.0.1:8000/api/v1/investigations/3/compare",
    headers={"Authorization": f"Bearer {access_token}"},
    json={
        "question": "Compare these documents and tell me who has a stronger chance of getting into a company with a good CTC with supporting points. Also give me the ATS score of all of these docs",
        "limit": 5
    }
)
print(f"Status: {res.status_code}")
print(res.text)
