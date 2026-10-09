import json
from datetime import datetime
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.routers.auth import get_current_user
from app.models.user import User
from app.models.investigation import Investigation
from app.models.agent_run import AgentRun
from app.models.document import Document
from app.models.knowledge_post import KnowledgePost

router = APIRouter(prefix="/api/v1/data", tags=["Data Export"])

@router.get("/export")
def export_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_data = {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "created_at": current_user.created_at.isoformat() if hasattr(current_user, 'created_at') and current_user.created_at else None,
        "mfa_enabled": current_user.mfa_enabled
    }

    docs = db.scalars(select(Document).where(Document.user_id == current_user.id)).all()
    documents_data = [{
        "id": d.id,
        "title": d.title,
        "filename": d.filename,
        "document_type": d.document_type,
        "uploaded_at": d.uploaded_at.isoformat() if d.uploaded_at else None
    } for d in docs]

    invs = db.scalars(select(Investigation).where(Investigation.user_id == current_user.id)).all()
    investigations_data = [{
        "id": i.id,
        "title": i.title,
        "description": i.description,
        "status": i.status,
        "created_at": i.created_at.isoformat() if i.created_at else None,
        "updated_at": i.updated_at.isoformat() if i.updated_at else None,
        "risk_level": getattr(i, "risk_level", None),
        "risk_score": getattr(i, "risk_score", None)
    } for i in invs]

    runs = db.scalars(select(AgentRun).where(AgentRun.user_id == current_user.id)).all()
    agent_runs_data = [{
        "id": r.id,
        "investigation_id": r.investigation_id,
        "question": r.question,
        "status": r.status,
        "finding": r.finding,
        "created_at": r.created_at.isoformat() if r.created_at else None
    } for r in runs]

    kps = db.scalars(select(KnowledgePost).where(KnowledgePost.user_id == current_user.id)).all()
    knowledge_data = [{
        "id": k.id,
        "title": k.title,
        "investigation_id": k.investigation_id,
        "created_at": k.created_at.isoformat() if k.created_at else None
    } for k in kps]

    export_json = {
        "user": user_data,
        "documents": documents_data,
        "investigations": investigations_data,
        "agent_runs": agent_runs_data,
        "knowledge_posts": knowledge_data,
        "exported_at": datetime.utcnow().isoformat()
    }
    
    headers = {
        "Content-Disposition": f"attachment; filename=opuslex_export_{current_user.id}.json"
    }
    return JSONResponse(content=export_json, headers=headers)
