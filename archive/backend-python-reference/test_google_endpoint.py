import sys
import json
from unittest.mock import patch, MagicMock
from app.routers.auth import google_sign_in
from app.schemas.auth import GoogleAuthRequest
from app.database import SessionLocal
from app.config import settings

def test_endpoint():
    db = SessionLocal()
    payload = GoogleAuthRequest(id_token="fake_token")
    
    # We will patch google_id_token.verify_oauth2_token
    with patch("google.oauth2.id_token.verify_oauth2_token") as mock_verify:
        mock_verify.return_value = {
            "email_verified": True,
            "sub": "1234567890",
            "email": "test@gmail.com",
            "name": "Test User"
        }
        try:
            res = google_sign_in(payload=payload, db=db)
            print("SUCCESS:", res)
        except Exception as e:
            print("ERROR:", e)

if __name__ == "__main__":
    test_endpoint()
