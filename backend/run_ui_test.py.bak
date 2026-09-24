import asyncio
import httpx
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import User
from app.core.security import create_access_token

def get_token_for_user(user_id: int):
    db = SessionLocal()
    user = db.query(User).filter(User.id == user_id).first()
    db.close()
    if not user:
        return None
    return create_access_token(
        data={"sub": str(user.id)}
    )

async def main():
    token = get_token_for_user(1)
    if not token:
        print("User 1 not found")
        return
        
    print(f"Got token for user 1")
    
    async with httpx.AsyncClient() as client:
        # Same exact request as the UI
        response = await client.post(
            "http://127.0.0.1:8000/api/v1/investigations/3/compare",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "question": "Compare these documents and tell me who has a stronger chance of getting a software engineer role.",
                "limit": 5
            },
            timeout=120.0
        )
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("Request successful. Check the backend logs for the [DIAG] output.")
        else:
            print(f"Failed: {response.text}")

asyncio.run(main())
