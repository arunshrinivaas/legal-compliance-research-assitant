import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from mcp.client.streamable_http import streamable_http_client
from mcp.client.session import ClientSession
from mcp.shared.exceptions import MCPError
from asgi_lifespan import LifespanManager

from app.main import app
from app.routers.auth import create_access_token
from app.models.policy import Policy
from app.models.compliance import Compliance
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.user import User
from app.database import SessionLocal

@pytest.fixture(scope="module")
def token():
    # Provide a valid user id for token
    return create_access_token({"sub": "1"})

@pytest.fixture(scope="module")
def token_b():
    return create_access_token({"sub": "2"})

@pytest.mark.asyncio
async def test_mcp_endpoints(token):
    async with LifespanManager(app):
        # 1. Unauthenticated request
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://127.0.0.1") as client:
            response = await client.post("/api/v1/mcp/")
            assert response.status_code == 401
            assert b"Not authenticated" in response.content

        # 2. Authenticated request and logic
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://127.0.0.1", headers={"Authorization": f"Bearer {token}"}) as client:
            db = SessionLocal()
            try:
                db_policy = Policy(
                    title="Test MCP Policy",
                    department="Engineering",
                    description="Test",
                    status="draft",
                    version="1.0",
                )
                db_policy_2 = Policy(
                    title="Test MCP Policy 2",
                    department="Engineering",
                    description="Test 2",
                    status="draft",
                    version="1.0",
                )
                db.add_all([db_policy, db_policy_2])

                # Insert test compliance obligations
                db_compliance_1 = Compliance(
                    title="GDPR Audit",
                    regulation="GDPR",
                    department="Legal",
                    status="Not Started",
                    risk_level="High"
                )
                db_compliance_2 = Compliance(
                    title="SOC2 Review",
                    regulation="SOC2",
                    department="Security",
                    status="In Progress",
                    risk_level="Medium"
                )
                db.add_all([db_compliance_1, db_compliance_2])
                db.commit()

                # Ensure users exist
                user1 = db.query(User).filter_by(id=1).first()
                if not user1:
                    user1 = User(id=1, email="u1@example.com", is_active=True, role="viewer")
                    db.add(user1)
                user2 = db.query(User).filter_by(id=2).first()
                if not user2:
                    user2 = User(id=2, email="u2@example.com", is_active=True, role="viewer")
                    db.add(user2)
                db.commit()

                # Insert test documents
                db_doc_1 = Document(
                    title="User 1 Doc",
                    filename="user1.pdf",
                    file_hash="hash1",
                    document_type="PDF",
                    jurisdiction="Unknown",
                    user_id=1
                )
                db_doc_2 = Document(
                    title="User 2 Doc",
                    filename="user2.pdf",
                    file_hash="hash2",
                    document_type="PDF",
                    jurisdiction="Unknown",
                    user_id=2
                )
                db.add_all([db_doc_1, db_doc_2])
                db.commit()

                db_chunk_1 = DocumentChunk(
                    document_id=db_doc_1.id,
                    chunk_index=0,
                    content="This is user 1 content.",
                )
                db_chunk_2 = DocumentChunk(
                    document_id=db_doc_2.id,
                    chunk_index=0,
                    content="This is user 2 content.",
                )
                db.add_all([db_chunk_1, db_chunk_2])
                # Note: We won't test vector embedding accuracy here (it's hard to mock pgvector easily in unit tests without invoking real LLMs or if distance tests fail), 
                # but we will test that retrieve_document_context calls it and ownership validation works.
                db.commit()
                
                
                async with streamable_http_client("http://127.0.0.1/api/v1/mcp/", http_client=client) as streams:
                    async with ClientSession(streams[0], streams[1]) as session:
                        await session.initialize()
                        tools_result = await session.list_tools()
                        tool_names = [t.name for t in tools_result.tools]
                        assert "list_policies" in tool_names
                        assert "list_compliance_obligations" in tool_names
                        assert "get_policy" not in tool_names
                        
                        result = await session.call_tool("list_policies", {})
                        content = result.content[0].text
                        assert "Test MCP Policy" in content
                        assert "Test MCP Policy 2" in content

                        # Test limit enforcement
                        result_limit = await session.call_tool("list_policies", {"limit": 1})
                        content_limit = result_limit.content[0].text
                        # It should return only 1 policy
                        import json
                        policies = json.loads(content_limit)
                        assert len(policies) == 1

                        # Test Compliance tool
                        comp_result = await session.call_tool("list_compliance_obligations", {})
                        comp_content = comp_result.content[0].text
                        assert "GDPR Audit" in comp_content
                        assert "SOC2 Review" in comp_content

                        # Test Compliance limits
                        comp_limit_res = await session.call_tool("list_compliance_obligations", {"limit": 1})
                        comp_limit_data = json.loads(comp_limit_res.content[0].text)
                        assert len(comp_limit_data) == 1

                        # Test Compliance filtering
                        comp_filter_res = await session.call_tool("list_compliance_obligations", {"status": "In Progress", "risk_level": "Medium"})
                        comp_filter_data = json.loads(comp_filter_res.content[0].text)
                        assert len(comp_filter_data) >= 1
                        assert all(c["status"] == "In Progress" and c["risk_level"] == "Medium" for c in comp_filter_data)
                        
                        # Test Document List
                        docs_res = await session.call_tool("list_my_documents", {})
                        docs_content = docs_res.content[0].text
                        assert "User 1 Doc" in docs_content
                        assert "User 2 Doc" not in docs_content # Cannot see user 2's doc

                        # Test Document Retrieval auth block
                        # Try to access User 2's doc
                        err_res = await session.call_tool("retrieve_document_context", {"query": "test", "document_ids": [db_doc_2.id]})
                        assert err_res.is_error or "Error" in err_res.content[0].text or "Not authorized" in err_res.content[0].text or "not found" in err_res.content[0].text
                            
                        # Test Document Retrieval success
                        ret_res = await session.call_tool("retrieve_document_context", {"query": "test", "document_ids": [db_doc_1.id]})
                        assert not ret_res.is_error
                        assert "No relevant documents" in ret_res.content[0].text or "context" in ret_res.content[0].text
            finally:
                db.query(Policy).filter(Policy.title.like("Test MCP Policy%")).delete(synchronize_session=False)
                db.query(Compliance).filter(Compliance.title.in_(["GDPR Audit", "SOC2 Review"])).delete(synchronize_session=False)
                db.query(DocumentChunk).filter(DocumentChunk.document_id.in_([db_doc_1.id, db_doc_2.id])).delete(synchronize_session=False)
                db.query(Document).filter(Document.title.in_(["User 1 Doc", "User 2 Doc"])).delete(synchronize_session=False)
                db.commit()
                db.close()


