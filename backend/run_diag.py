import asyncio
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Investigation, Document
from app.models.investigation_document import InvestigationDocument
from app.services.rag_service import compare_documents
import app.services.rag_service as rs

# Intercept prompt
captured_prompt = ""
original_ask = rs.ask_copilot_with_context
async def mock_ask(question, context):
    global captured_prompt
    captured_prompt = question
    return await original_ask(question, context)
rs.ask_copilot_with_context = mock_ask

async def run_diag():
    db = SessionLocal()
    docs_orm = db.query(Document).join(InvestigationDocument, Document.id == InvestigationDocument.document_id).filter(InvestigationDocument.investigation_id == 3).order_by(InvestigationDocument.document_id).all()
    docs = [{"id": d.id, "title": d.title, "filename": d.filename, "jurisdiction": d.jurisdiction} for d in docs_orm]
    
    # User said "Use the current investigation containing 4 attached documents."
    # Our DB showed Inv 3 had 4 docs.
    
    print(f"\n[DIAG:compare] 1. Number of documents received: {len(docs)}")
    print("[DIAG:compare] 2. Exact A/B/C/D mapping:")
    labels = ["A", "B", "C", "D", "E"]
    for i, d in enumerate(docs):
        print(f"   {labels[i]} -> id={d['id']} filename={d['filename']}")
        
    result = await compare_documents(db, "Compare these documents", docs, limit=5)
    
    # Analyze the prompt string (captured_prompt)
    prompt_len = len(captured_prompt)
    has_a = "Document A" in captured_prompt
    has_b = "Document B" in captured_prompt
    has_c = "Document C" in captured_prompt
    has_d = "Document D" in captured_prompt
    
    print("\n[DIAG:compare] 6. Prompt checks:")
    print(f"   A present in prompt: {has_a}")
    print(f"   B present in prompt: {has_b}")
    print(f"   C present in prompt: {has_c}")
    print(f"   D present in prompt: {has_d}")
    print(f"[DIAG:compare] 7. Total prompt length: {prompt_len}")
    
    ans = result["comparison"]
    print(f"[DIAG:compare] 8. Actual response length: {len(ans)}")
    
    ans_has_a = "Document A" in ans
    ans_has_b = "Document B" in ans
    ans_has_c = "Document C" in ans
    ans_has_d = "Document D" in ans
    print("\n[DIAG:compare] 9. Final LLM Response checks:")
    print(f"   A present in response: {ans_has_a}")
    print(f"   B present in response: {ans_has_b}")
    print(f"   C present in response: {ans_has_c}")
    print(f"   D present in response: {ans_has_d}")
    
    print("\n[DIAG:compare] Final Answer Preview (first 500 chars):")
    print(ans[:500])

asyncio.run(run_diag())
