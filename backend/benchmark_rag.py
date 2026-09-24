import asyncio
import time
from sqlalchemy import select
from app.database import SessionLocal
from app.services.embedding_service import generate_embedding
from app.services.retrieval_service import search_similar_chunks
from app.services.rag_service import answer_with_rag
from app.services.copilot_service import ask_copilot_with_context
from app.models.document import Document
from app.models.investigation import Investigation
from app.models.investigation_document import InvestigationDocument
from app.models.user import User

async def run_benchmark():
    db = SessionLocal()
    user = db.scalar(select(User).limit(1))
    if not user:
        print("No users found.")
        return

    print("========================================")
    print("        RAG BASELINE BENCHMARK          ")
    print("========================================")

    # 1. Measure Embedding Generation
    text_to_embed = "This is a typical legal compliance query regarding data protection and GDPR requirements in the EU."
    t0 = time.perf_counter()
    emb = generate_embedding(text_to_embed)
    t1 = time.perf_counter()
    embedding_ms = (t1 - t0) * 1000
    print(f"[RAG PERF] embedding_ms = {embedding_ms:.2f} ms")

    # 2. Measure Vector Retrieval (pgvector)
    t0 = time.perf_counter()
    chunks = search_similar_chunks(db, query=text_to_embed, limit=5, distance_threshold=0.8)
    t1 = time.perf_counter()
    retrieval_ms = (t1 - t0) * 1000
    print(f"[RAG PERF] retrieval_ms = {retrieval_ms:.2f} ms")
    print(f"  Retrieved {len(chunks)} chunks.")

    # 3. Measure LLM Generation Time (Context provided)
    context_text = "\n\n".join([f"Chunk {i}: {c['content']}" for i, c in enumerate(chunks)])
    t0 = time.perf_counter()
    response = await ask_copilot_with_context(
        question="What are the GDPR requirements?",
        context=context_text or "No context available."
    )
    t1 = time.perf_counter()
    llm_ms = (t1 - t0) * 1000
    print(f"[RAG PERF] llm_ms = {llm_ms:.2f} ms")
    
    # 4. Total End-to-End RAG
    print("\nRunning E2E RAG...")
    t0 = time.perf_counter()
    result = await answer_with_rag(db, "What are the GDPR requirements?", limit=5)
    t1 = time.perf_counter()
    total_ms = (t1 - t0) * 1000
    print(f"[RAG PERF] total_ms = {total_ms:.2f} ms")
    
    print("\n----------------------------------------")
    print("Done.")

if __name__ == "__main__":
    asyncio.run(run_benchmark())
