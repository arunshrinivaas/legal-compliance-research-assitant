import asyncio
import os
import json
import time
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.routers.auth import create_access_token

client = TestClient(app)

def run_pilot():
    db = SessionLocal()
    test_run_id = str(uuid.uuid4())[:8]
    doc_id = None
    inv_id = None

    try:
        # Create users
        user1 = db.query(User).filter_by(email="pilot1@example.com").first()
        if not user1:
            user1 = User(email="pilot1@example.com", is_active=True, role="admin")
            db.add(user1)

        user2 = db.query(User).filter_by(email="pilot2@example.com").first()
        if not user2:
            user2 = User(email="pilot2@example.com", is_active=True, role="admin")
            db.add(user2)

        db.commit()
        db.refresh(user1)
        db.refresh(user2)

        token1 = create_access_token({"sub": str(user1.id), "role": user1.role})
        headers1 = {"Authorization": f"Bearer {token1}"}

        token2 = create_access_token({"sub": str(user2.id), "role": user2.role})
        headers2 = {"Authorization": f"Bearer {token2}"}

        print("\n=== Test 1: Upload a document ===")
        with open("pilot_doc.txt", "rb") as f:
            files = {"file": (f"pilot_doc_{test_run_id}.txt", f, "text/plain")}
            data = {"title": f"Company Policy {test_run_id}", "document_type": "TXT", "jurisdiction": "Global"}
            response = client.post("/api/v1/documents/upload", files=files, data=data, headers=headers1, timeout=30.0)

        assert response.status_code == 200, f"Upload failed: {response.text}"
        doc_info = response.json()
        doc_id = doc_info["document_id"]

        chunks = db.query(DocumentChunk).filter_by(document_id=doc_id).count()
        print(f"Document ID: {doc_id}, Chunks: {chunks}, Status: Success")

        print("\n=== Test 2: Live RAG questions ===")
        questions = [
            ("How many days can employees work remotely?", "explicitly stated", "3 days"),
            ("What are the core working hours and what is the maximum reimbursement for internet?", "two parts", "10:00 AM"),
            ("What is the policy for health insurance?", "absent", "not contain")
        ]

        for q, reason, expected in questions:
            t0 = time.time()
            resp = client.post("/api/v1/rag/ask", json={"question": q}, headers=headers1, timeout=60.0)
            t1 = time.time()

            if resp.status_code == 200:
                data = resp.json()
                ans = data.get('answer', '')
                sources = data.get('sources', [])
                valid_citation = len(sources) > 0 or reason == "absent"
                if expected.lower() in ans.lower():
                    print(f"PASS ({reason}): Latency={t1-t0:.2f}s, Citation Valid={valid_citation}")
                else:
                    print(f"FAIL ({reason}): Expected '{expected}' not found in '{ans}'")
            else:
                print(f"FAIL ({reason}): HTTP {resp.status_code}")

        print("\n=== Test 3: MCP User Scoping ===")
        from app.routers.mcp import list_my_documents_tool, retrieve_document_context_tool, mcp_user_id

        mcp_user_id.set(user1.id)
        list_res1 = json.loads(asyncio.run(list_my_documents_tool(None, limit=10)))
        assert any(d["id"] == doc_id for d in list_res1), "User 1 should see doc"

        mcp_user_id.set(user2.id)
        list_res2 = json.loads(asyncio.run(list_my_documents_tool(None, limit=10)))
        assert not any(d["id"] == doc_id for d in list_res2), "User 2 should NOT see User 1's doc"
        print("PASS: MCP User scoping correctly isolated documents.")

        print("\n=== Test 4: Investigation agent ===")
        inv_resp = client.post("/api/v1/investigations/", json={"title": f"Pilot Inv {test_run_id}", "description": "Test"}, headers=headers1, timeout=10.0)
        assert inv_resp.status_code in [200, 201], inv_resp.text
        inv_id = inv_resp.json()["id"]

        attach_resp = client.post(f"/api/v1/investigations/{inv_id}/documents/{doc_id}", headers=headers1, timeout=10.0)
        assert attach_resp.status_code in [200, 201], attach_resp.text

        t0 = time.time()
        agent_resp = client.post(f"/api/v1/agents/investigations/{inv_id}/run", json={"question": "Summarize the remote work policy."}, headers=headers1, timeout=60.0)
        t1 = time.time()
        assert agent_resp.status_code in [200, 201], agent_resp.text
        agent_data = agent_resp.json()

        valid_evidence = True
        for ev in agent_data.get('evidence', []):
            if ev['source_document'] not in f"pilot_doc_{test_run_id}.txt":
                valid_evidence = False
        print(f"PASS: Agent completed in {t1-t0:.2f}s, Valid Evidence Scope: {valid_evidence}")

    finally:
        # Cleanup
        print("\n=== Cleanup ===")
        if inv_id:
            client.delete(f"/api/v1/investigations/{inv_id}", headers=headers1)
        if doc_id:
            client.delete(f"/api/v1/documents/{doc_id}", headers=headers1)
        print("Cleanup completed.")
        db.close()

if __name__ == "__main__":
    run_pilot()
