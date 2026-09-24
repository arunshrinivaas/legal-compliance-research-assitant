import asyncio
import httpx
from datetime import datetime

async def main():
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8000") as client:
        # Phase 1: Startup
        print("Checking API health...")
        try:
            r = await client.get("/")
            print(f"GET / -> {r.status_code}")
        except Exception as e:
            print(f"Failed to connect: {e}")
            return
            
        # Phase 2: Auth
        print("\nChecking Auth...")
        # Try without auth
        r = await client.get("/api/v1/workspace/overview")
        print(f"GET /api/v1/workspace/overview (no auth) -> {r.status_code}")
        
        # Try with dummy auth
        login_data = {"username": "admin@example.com", "password": "password123"}
        r = await client.post("/api/v1/auth/login", data=login_data)
        print(f"POST /api/v1/auth/login (dummy) -> {r.status_code}")
        if r.status_code == 200:
            token = r.json().get("access_token")
            client.headers.update({"Authorization": f"Bearer {token}"})
            r = await client.get("/api/v1/workspace/overview")
            print(f"GET /api/v1/workspace/overview (auth) -> {r.status_code}")
            
            # Phase 14: Ask OpusLex
            r = await client.post("/api/v1/help/ask", json={"query": "How do I create an investigation?"})
            print(f"POST /api/v1/help/ask -> {r.status_code}")
            
if __name__ == "__main__":
    asyncio.run(main())
