import logging
from fastapi import HTTPException

from fastapi.security import HTTPAuthorizationCredentials

from starlette.types import Scope, Receive, Send

import contextvars

from mcp.server.mcpserver import MCPServer, Context
from mcp.server.transport_security import TransportSecuritySettings

from app.routers.auth import get_current_user
from app.database import SessionLocal
from app.routers.policies import get_policies
from app.routers.compliance import get_compliance

from app.models.document import Document
from app.services.rag_service import build_rag_context

logger = logging.getLogger(__name__)

# Context var to hold the authenticated user ID for the current MCP session
mcp_user_id = contextvars.ContextVar("mcp_user_id", default=None)

mcp_server = MCPServer("opuslex", "1.0.0")

@mcp_server.tool("list_policies")
async def list_policies_tool(
    ctx: Context,
    department: str | None = None,
    limit: int = 100
) -> str:
    """Return the currently available governance policies from the existing Policy repository."""
    user_id = mcp_user_id.get()
    if not user_id:
        raise ValueError("Unauthenticated tool execution context")
    
    # Run business logic
    db = SessionLocal()
    try:
        response = get_policies(search=None, status=None, department=department, limit=limit, offset=0, db=db)
        policies = response["items"]
        # Format the response based on the fields requested
        import json
        result = []
        for p in policies:
            result.append({
                "id": p.id,
                "title": p.title,
                "version": p.version,
                "status": p.status,
                "department": p.department,
                "effective_date": p.effective_date.isoformat() if p.effective_date else None,
            })
        return json.dumps(result, indent=2)
    finally:
        db.close()

@mcp_server.tool("list_compliance_obligations")
async def list_compliance_obligations_tool(
    ctx: Context,
    search: str | None = None,
    status: str | None = None,
    risk_level: str | None = None,
    limit: int = 100
) -> str:
    """Return compliance obligations available to the authenticated OpusLex user."""
    user_id = mcp_user_id.get()
    if not user_id:
        raise ValueError("Unauthenticated tool execution context")
    
    db = SessionLocal()
    try:
        response = get_compliance(
            search=search,
            status=status,
            risk_level=risk_level,
            limit=limit,
            offset=0,
            db=db
        )
        obligations = response["items"]
        import json
        result = []
        for obs in obligations:
            result.append({
                "id": obs.id,
                "title": obs.title,
                "description": obs.description,
                "regulation": obs.regulation,
                "risk_level": obs.risk_level,
                "due_date": obs.due_date.isoformat() if obs.due_date else None,
                "status": obs.status,
            })
        return json.dumps(result, indent=2)
    finally:
        db.close()

@mcp_server.tool("list_my_documents")
async def list_my_documents_tool(
    ctx: Context,
    limit: int = 100
) -> str:
    """Return documents belonging ONLY to the authenticated OpusLex user."""
    user_id = mcp_user_id.get()
    if not user_id:
        raise ValueError("Unauthenticated tool execution context")
    
    db = SessionLocal()
    try:
        documents = (
            db.query(Document)
            .filter(Document.user_id == user_id)
            .order_by(Document.uploaded_at.desc())
            .limit(limit)
            .all()
        )
        import json
        result = []
        for doc in documents:
            result.append({
                "id": doc.id,
                "title": doc.title,
                "filename": doc.filename,
                "document_type": doc.document_type,
                "created_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
            })
        return json.dumps(result, indent=2)
    finally:
        db.close()

@mcp_server.tool("retrieve_document_context")
async def retrieve_document_context_tool(
    ctx: Context,
    query: str,
    document_ids: list[int] | None = None
) -> str:
    """Retrieve relevant semantic context from the authenticated user's documents for AI analysis."""
    user_id = mcp_user_id.get()
    if not user_id:
        raise ValueError("Unauthenticated tool execution context")
    
    db = SessionLocal()
    try:
        # Validate ownership if document_ids provided
        if document_ids:
            docs = db.query(Document.id, Document.user_id).filter(Document.id.in_(document_ids)).all()
            found_ids = set()
            for d in docs:
                if d.user_id != user_id:
                    raise ValueError(f"Not authorized to access document {d.id} or it does not exist.")
                found_ids.add(d.id)
            for d_id in document_ids:
                if d_id not in found_ids:
                    raise ValueError(f"Document {d_id} not found.")

        if not query.strip():
            raise ValueError("Query string cannot be empty.")
            
        context, sources = build_rag_context(
            db=db,
            query=query,
            limit=5,
            document_ids=document_ids,
            user_id=user_id
        )
        import json
        return json.dumps({"context": context, "sources": sources}, indent=2)
    finally:
        db.close()

@mcp_server.tool("list_audit_findings")
async def list_audit_findings_tool(
    ctx: Context,
    investigation_id: int | None = None,
    status: str | None = None,
    limit: int = 50
) -> str:
    """Return audit findings (AgentRun records) belonging to the authenticated user."""
    user_id = mcp_user_id.get()
    if not user_id:
        raise ValueError("Unauthenticated tool execution context")

    from sqlalchemy import select
    from app.models.agent_run import AgentRun
    from app.models.investigation import Investigation

    db = SessionLocal()
    try:
        stmt = (
            select(AgentRun, Investigation.title.label("inv_title"))
            .join(Investigation, Investigation.id == AgentRun.investigation_id)
            .where(AgentRun.user_id == user_id)
        )
        if investigation_id is not None:
            stmt = stmt.where(AgentRun.investigation_id == investigation_id)
        if status:
            stmt = stmt.where(AgentRun.status == status)

        rows = db.execute(stmt.order_by(AgentRun.created_at.desc()).limit(limit)).all()

        import json
        result = []
        for run, inv_title in rows:
            result.append({
                "id": run.id,
                "investigation_id": run.investigation_id,
                "investigation_title": inv_title,
                "question": run.question,
                "status": run.status,
                "finding": run.finding,
                "created_at": run.created_at.isoformat() if run.created_at else None,
            })
        return json.dumps(result, indent=2)
    finally:
        db.close()

mcp_app = mcp_server.streamable_http_app(
    streamable_http_path="/",
    transport_security=TransportSecuritySettings(
        enable_dns_rebinding_protection=True,
        allowed_hosts=["127.0.0.1", "localhost", "testserver", "test"]
    )
)

class AuthBridgeMiddleware:
    """
    Middleware that intercepts requests to /api/v1/mcp,
    validates the JWT, and extracts the user context before passing
    to the ASGI app_manager.
    """
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] == "http":
            path = scope.get("path", "")
            if path.startswith("/api/v1/mcp"):
                headers = dict(scope.get("headers", []))
                auth_header = headers.get(b"authorization")
                
                if not auth_header or not auth_header.startswith(b"bearer ") and not auth_header.startswith(b"Bearer "):
                    await self._send_error(send, 401, b"Not authenticated")
                    return
                
                # 'Bearer ' is 7 characters
                token = auth_header[7:].decode("utf-8")
                db = SessionLocal()
                try:
                    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
                    user = get_current_user(credentials=credentials, db=db)
                    # Set the contextvar!
                    token_cv = mcp_user_id.set(user.id)
                    try:
                        await self.app(scope, receive, send)
                    finally:
                        mcp_user_id.reset(token_cv)
                except HTTPException as e:
                    await self._send_error(send, e.status_code, str(e.detail).encode("utf-8"))
                except Exception as e:
                    logger.error(f"MCP Auth Error: {e}")
                    await self._send_error(send, 500, b"Internal Server Error")
                finally:
                    db.close()
                return

        # Pass through for other routes
        await self.app(scope, receive, send)

    async def _send_error(self, send: Send, status: int, body: bytes):
        await send({
            "type": "http.response.start",
            "status": status,
            "headers": [(b"content-length", str(len(body)).encode())],
        })
        await send({
            "type": "http.response.body",
            "body": body,
        })
