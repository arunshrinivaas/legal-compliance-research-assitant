import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from app.main import app
from app.models.user import User

client = TestClient(app)

dummy_user = User(
    id=1,
    email="test@example.com",
    password_hash="test",
    is_active=True,
    role="viewer"
)

@pytest.fixture
def override_auth():
    from app.routers.auth import get_current_user
    app.dependency_overrides[get_current_user] = lambda: dummy_user
    yield
    app.dependency_overrides = {}

def test_ask_rag_unauthenticated():
    response = client.post("/api/v1/rag/ask", json={"question": "What is the policy?"})
    assert response.status_code == 401

def test_ask_rag_empty_question(override_auth):
    # Depending on pydantic models or router, empty question might be handled or not
    # Pydantic string validation doesn't inherently block empty string unless specified
    response = client.post("/api/v1/rag/ask", json={"question": ""})
    # If the router just passes it to the service, the service might handle it or the LLM. 
    # Let's mock answer_with_rag to return something
    with patch("app.routers.rag.answer_with_rag") as mock_answer:
        mock_answer.return_value = {"question": "", "answer": "Mocked Answer", "sources": []}
        response = client.post("/api/v1/rag/ask", json={"question": ""})
        assert response.status_code == 200

def test_ask_rag_valid_global(override_auth):
    with patch("app.routers.rag.answer_with_rag") as mock_answer:
        mock_answer.return_value = {"question": "Test?", "answer": "Global RAG Answer", "sources": []}
        response = client.post("/api/v1/rag/ask", json={"question": "Test?"})
        assert response.status_code == 200
        data = response.json()
        assert data["answer"] == "Global RAG Answer"
        mock_answer.assert_called_once()
        assert mock_answer.call_args.kwargs["document_ids"] is None

def test_ask_rag_investigation_not_found(override_auth):
    with patch("app.routers.rag.Session.scalar", return_value=None):
        response = client.post("/api/v1/rag/ask", json={"question": "Test?", "investigation_id": 999})
        assert response.status_code == 404
        assert "Investigation not found" in response.json()["detail"]

