import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import select
import uuid

from app.main import app
from app.database import SessionLocal
from app.models.user import User
from app.models.investigation import Investigation
from app.models.agent_run import AgentRun
from app.models.document import Document
from app.routers.auth import create_access_token

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def test_user(db: Session):
    user = User(
        email=f"agent_test_{uuid.uuid4().hex[:8]}@example.com", 
        password_hash="hash", 
        role="admin", 
        is_active=True, 
        email_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@pytest.fixture
def test_investigation(db: Session, test_user: User):
    doc = Document(
        title="Test Document",
        filename="test_doc.pdf",
        file_hash=f"hash_{uuid.uuid4().hex}",
        document_type="policy",
        jurisdiction="global",
        user_id=test_user.id
    )

    inv = Investigation(title="Agent Test Inv", user_id=test_user.id, status="open")
    inv.documents.append(doc)
    
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return inv

@pytest.fixture
def owner_headers(test_user: User):
    token = create_access_token({"sub": str(test_user.id), "role": "admin"})
    return {"Authorization": f"Bearer {token}"}

# 1. Successful execution
@patch("app.services.agent_service.build_rag_context")
@patch("app.services.agent_service._run_agent_llm")
def test_successful_evidence_backed_execution(mock_llm, mock_rag, client, db, test_investigation, owner_headers):
    mock_rag.return_value = ("Sample document context", [1])
    mock_llm.return_value = '''
    {
        "finding": "Test finding",
        "evidence": [{
            "claim": "Claim A",
            "source_document": "Doc A",
            "source_section_or_chunk": "Section 1",
            "supporting_text": "Quote A"
        }],
        "conflicts": [{
            "description": "Conflict A",
            "documents": ["Doc A", "Doc B"],
            "relationship": "Contradicts"
        }],
        "evidence_gaps": [],
        "applicable_requirements": [{
            "requirement": "Req 1",
            "source_document": "Doc A",
            "source_section_or_chunk": "Section 1"
        }],
        "suggested_actions": [{
            "action": "Action 1",
            "rationale": "Rationale 1"
        }],
        "citations": [{
            "source_document": "Doc A",
            "source_section_or_chunk": "Section 1"
        }]
    }
    '''
    
    res = client.post(
        f"/api/v1/agents/investigations/{test_investigation.id}/run",
        json={"question": "What is the compliance status?"},
        headers=owner_headers
    )
    
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "completed"
    
    agent_run = db.scalar(select(AgentRun).where(AgentRun.id == data["id"]))
    assert agent_run is not None
    assert agent_run.status == "completed"
    assert len(agent_run.conflicts) == 1
    assert len(agent_run.suggested_actions) == 1
    # Risk score calculation: 100 - (20 * 1 conflict) - (5 * 1 action) = 75 (Medium)
    assert agent_run.risk_score == 75
    assert agent_run.risk_level == "Medium"


# 2. Missing evidence early exit
@patch("app.services.agent_service.build_rag_context")
def test_missing_evidence_early_exit(mock_rag, client, db, test_investigation, owner_headers):
    mock_rag.return_value = ("No relevant documents were found.", [])
    
    res = client.post(
        f"/api/v1/agents/investigations/{test_investigation.id}/run",
        json={"question": "What is the compliance status?"},
        headers=owner_headers
    )
    
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "completed"
    assert "I cannot answer this question because there is no relevant evidence" in data["finding"]
    assert data["risk_score"] == 0


# 3. Model timeout or error handling
@patch("app.services.agent_service.build_rag_context")
@patch("app.services.agent_service._run_agent_llm")
def test_model_timeout_or_error_handling(mock_llm, mock_rag, client, db, test_investigation, owner_headers):
    mock_rag.return_value = ("Sample document context", [1])
    mock_llm.side_effect = RuntimeError("Copilot API failed: Request timed out after 120 seconds.")
    
    res = client.post(
        f"/api/v1/agents/investigations/{test_investigation.id}/run",
        json={"question": "What is the compliance status?"},
        headers=owner_headers
    )
    
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "failed"
    assert "Execution error: Copilot API failed" in data["finding"]

    agent_run = db.scalar(select(AgentRun).where(AgentRun.id == data["id"]))
    assert agent_run.status == "failed"


# 4. Output validation failure
@patch("app.services.agent_service.build_rag_context")
@patch("app.services.agent_service._run_agent_llm")
def test_output_validation_failure(mock_llm, mock_rag, client, db, test_investigation, owner_headers):
    mock_rag.return_value = ("Sample document context", [1])
    mock_llm.return_value = '{ malformed JSON }'
    
    res = client.post(
        f"/api/v1/agents/investigations/{test_investigation.id}/run",
        json={"question": "What is the compliance status?"},
        headers=owner_headers
    )
    
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "failed"
    assert data["finding"].startswith("Failed to parse or validate LLM response")


# 5. Frontend responsiveness / timeout
@patch("app.services.agent_service.build_rag_context")
@patch("app.services.agent_service._run_agent_llm")
def test_frontend_responsiveness_timeout(mock_llm, mock_rag, client, db, test_investigation, owner_headers):
    import asyncio
    mock_rag.return_value = ("Sample document context", [1])
    
    async def slow_llm(*args, **kwargs):
        await asyncio.sleep(0.1)
        raise asyncio.TimeoutError()
        
    mock_llm.side_effect = slow_llm
    
    res = client.post(
        f"/api/v1/agents/investigations/{test_investigation.id}/run",
        json={"question": "What is the compliance status?"},
        headers=owner_headers
    )
    
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "failed"
