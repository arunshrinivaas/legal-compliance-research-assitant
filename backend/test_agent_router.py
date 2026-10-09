from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from datetime import datetime

from app.main import app
from app.models.user import User

client = TestClient(app)

# Dummy user for auth overriding
dummy_user = User(
    id=1,
    email="test@example.com",
    password_hash="test",
    is_active=True,
)

# A valid mock agent run response to return from our service mock
class MockAgentRun:
    def __init__(self, **kwargs):
        self.id = 100
        self.investigation_id = kwargs.get("investigation_id", 1)
        self.user_id = kwargs.get("user_id", 1)
        self.question = kwargs.get("question", "test question")
        self.status = "completed"
        self.finding = "Found something"
        self.evidence = []
        self.conflicts = []
        self.evidence_gaps = []
        self.applicable_requirements = []
        self.suggested_actions = []
        self.citations = []
        self.created_at = datetime.utcnow()

@pytest.fixture
def override_auth():
    from app.routers.auth import get_current_user
    app.dependency_overrides[get_current_user] = lambda: dummy_user
    yield
    app.dependency_overrides = {}


def test_unauthenticated_request_rejected():
    response = client.post("/api/v1/agents/investigations/1/run", json={"question": "test?"})
    assert response.status_code == 401


def test_valid_request_returns_agent_run(override_auth):
    with patch("app.routers.agent.run_compliance_investigation") as mock_run:
        mock_run.return_value = MockAgentRun(investigation_id=1, user_id=1, question="test question?")
        
        response = client.post("/api/v1/agents/investigations/1/run", json={"question": "test question?"})
        
        assert response.status_code == 201
        data = response.json()
        assert data["id"] == 100
        assert data["investigation_id"] == 1
        assert data["status"] == "completed"
        assert data["question"] == "test question?"
        assert data["finding"] == "Found something"


def test_empty_question_rejected(override_auth):
    # Missing question entirely
    response = client.post("/api/v1/agents/investigations/1/run", json={})
    assert response.status_code == 422  # Pydantic validation error

    # Empty string question
    response = client.post("/api/v1/agents/investigations/1/run", json={"question": "   "})
    assert response.status_code == 400
    assert "Question cannot be empty" in response.json()["detail"]


def test_user_id_from_request_body_ignored(override_auth):
    with patch("app.routers.agent.run_compliance_investigation") as mock_run:
        mock_run.return_value = MockAgentRun()
        
        # Send user_id in the body. The Pydantic model AgentRunRequest doesn't have it,
        # so it's stripped/ignored by FastAPI, and the endpoint uses current_user.id
        response = client.post("/api/v1/agents/investigations/1/run", json={"question": "test?", "user_id": 999})
        
        assert response.status_code == 201
        # Check what was passed to the service
        kwargs = mock_run.call_args.kwargs
        assert kwargs["user_id"] == dummy_user.id  # Must be 1, not 999


def test_investigation_id_from_url_passed_correctly(override_auth):
    with patch("app.routers.agent.run_compliance_investigation") as mock_run:
        mock_run.return_value = MockAgentRun()
        
        response = client.post("/api/v1/agents/investigations/42/run", json={"question": "test?"})
        assert response.status_code == 201
        
        kwargs = mock_run.call_args.kwargs
        assert kwargs["investigation_id"] == 42


def test_agent_service_value_error_returns_404(override_auth):
    with patch("app.routers.agent.run_compliance_investigation") as mock_run:
        # Simulate Investigation not found
        mock_run.side_effect = ValueError("Investigation not found")
        
        response = client.post("/api/v1/agents/investigations/1/run", json={"question": "test?"})
        
        assert response.status_code == 404
        assert "Investigation not found" in response.json()["detail"]


def test_agent_service_unexpected_error_returns_500(override_auth):
    with patch("app.routers.agent.run_compliance_investigation") as mock_run:
        # Simulate unexpected error
        mock_run.side_effect = Exception("Some weird DB error")
        
        response = client.post("/api/v1/agents/investigations/1/run", json={"question": "test?"})
        
        assert response.status_code == 500
        assert "unexpected error" in response.json()["detail"]
        # Make sure the raw stack trace/error isn't leaked
        assert "Some weird DB error" not in response.json()["detail"]
