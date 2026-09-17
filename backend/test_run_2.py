import asyncio
from app.database import SessionLocal
from app.routers.investigations import CompareRequest, compare_investigation_documents
from app.models.user import User

async def main():
    db = SessionLocal()
    user = db.query(User).filter(User.email == "arun-test-001@example.com").first()
    
    payload = CompareRequest(
        question="Compare these documents and tell me who has a stronger chance of getting into a company with a good CTC with supporting points. Also give me the ATS score of all of these docs",
        limit=5
    )
    
    try:
        res = await compare_investigation_documents(
            investigation_id=3,
            payload=payload,
            db=db,
            current_user=user
        )
        print("Success:", res)
    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        db.close()

asyncio.run(main())
