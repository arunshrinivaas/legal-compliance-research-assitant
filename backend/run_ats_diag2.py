import asyncio
import sys
sys.path.insert(0, ".")

from app.database import SessionLocal
from app.services.rag_service import compare_documents

DOCS = [
    {"id": 29, "title": "arunresumeWD.pdf",            "filename": "arunresumeWD.pdf",               "jurisdiction": "Unknown"},
    {"id": 30, "title": "shabresumeWEBDEV.pdf",         "filename": "shabresumeWEBDEV.pdf",            "jurisdiction": "Unknown"},
    {"id": 31, "title": "ST Ezhil Maaran (1).pdf",     "filename": "ST Ezhil Maaran (1).pdf",         "jurisdiction": "Unknown"},
    {"id": 33, "title": "RESUME ( Raakeshravie S)1.pdf","filename": "RESUME ( Raakeshravie S)1.pdf",  "jurisdiction": "Unknown"},
]

QUESTION = "Compare these documents and tell me who has a stronger chance of getting into a company with a good CTC with supporting points. Also give me the ATS score of all of these docs"

async def main():
    db = SessionLocal()
    try:
        result = await compare_documents(db=db, question=QUESTION, documents=DOCS, limit=5)
    finally:
        db.close()

    print("\n\n===== CLIENT-SIDE VIEW =====")
    print(f"documents count: {len(DOCS)}")
    print(f"comparison length: {len(result['comparison'])}")
    print("\n--- FULL COMPARISON TEXT ---")
    print(result["comparison"])

asyncio.run(main())
