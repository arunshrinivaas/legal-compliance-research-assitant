import asyncio
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from app.database import engine, SessionLocal
from app.models.user import User
from app.models.investigation import Investigation
from app.models.document import Document
from app.models.investigation_document import InvestigationDocument
from app.models.document_chunk import DocumentChunk
from app.services.rag_service import compare_documents

async def main():
    db = SessionLocal()
    # Find any user
    user = db.scalar(select(User).limit(1))
    if not user:
        print("No user found")
        return

    # Find investigation 3 or any
    inv = db.scalar(select(Investigation).limit(1))
    if not inv:
        print("No investigation")
        return

    # Get documents
    docs = db.scalars(select(Document).join(InvestigationDocument).where(InvestigationDocument.investigation_id == inv.id)).all()
    if len(docs) < 4:
        # Create some fake ones
        for i in range(4 - len(docs)):
            doc = Document(user_id=user.id, title=f"Test {i}", filename=f"test{i}.pdf", document_type="Policy", jurisdiction="US")
            db.add(doc)
            db.commit()
            db.add(InvestigationDocument(investigation_id=inv.id, document_id=doc.id))
            db.commit()

        docs = db.scalars(select(Document).join(InvestigationDocument).where(InvestigationDocument.investigation_id == inv.id)).all()

    ordered_docs = [
        {
            "id": d.id,
            "title": d.title,
            "filename": d.filename,
            "jurisdiction": d.jurisdiction,
        }
        for d in docs
    ]
    
    print(f"Comparing {len(ordered_docs)} docs...")
    result = await compare_documents(db, "Compare these documents", ordered_docs, 5)
    print("RESULT LENGTH:", len(result["comparison"]))
    print("RESULT PREVIEW:", result["comparison"][:200])
    
    # Check if A, B, C, D are in response
    for l in "ABCD":
        print(f"Document {l} in response?", f"Document {l}" in result["comparison"])

if __name__ == "__main__":
    asyncio.run(main())
