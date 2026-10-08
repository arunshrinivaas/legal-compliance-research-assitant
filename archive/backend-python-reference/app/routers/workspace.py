from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.routers.auth import get_current_user
from app.models.investigation import Investigation
from app.models.document import Document
from app.models.agent_run import AgentRun
from app.models.knowledge_post import KnowledgePost
from app.schemas.workspace import (
    WorkspaceOverviewResponse,
    MetricCards,
    ActiveInvestigationSchema,
    ActivityItemSchema,
)

router = APIRouter(prefix="/api/v1/workspace", tags=["Workspace"])

@router.get("/overview", response_model=WorkspaceOverviewResponse)
def get_workspace_overview(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    user_id = current_user.id

    # 1. Metrics
    active_inv_count = db.query(func.count(Investigation.id)).filter(
        Investigation.user_id == user_id,
        Investigation.status == "Active"
    ).scalar() or 0

    doc_count = db.query(func.count(Document.id)).filter(
        Document.user_id == user_id
    ).scalar() or 0

    agent_run_count = db.query(func.count(AgentRun.id)).filter(
        AgentRun.user_id == user_id
    ).scalar() or 0

    metrics = MetricCards(
        active_investigations=active_inv_count,
        total_documents=doc_count,
        total_agent_runs=agent_run_count,
    )

    # 2. Active Investigations (Top 5 recently updated)
    active_invs_db = db.query(Investigation).filter(
        Investigation.user_id == user_id,
        Investigation.status == "Active"
    ).order_by(Investigation.updated_at.desc()).limit(5).all()

    active_invs = []
    for inv in active_invs_db:
        doc_c = len(inv.documents)
        run_c = len(inv.agent_runs)
        active_invs.append(ActiveInvestigationSchema(
            id=inv.id,
            title=inv.title,
            description=inv.description,
            status=inv.status,
            updated_at=inv.updated_at,
            documents_count=doc_c,
            agent_runs_count=run_c
        ))

    # 3. Recent Activity
    # Fetch recent items from multiple tables and combine them
    recent_invs = db.query(Investigation).filter(Investigation.user_id == user_id).order_by(Investigation.updated_at.desc()).limit(5).all()
    recent_docs = db.query(Document).filter(Document.user_id == user_id).order_by(Document.uploaded_at.desc()).limit(5).all()
    recent_runs = db.query(AgentRun).filter(AgentRun.user_id == user_id).order_by(AgentRun.created_at.desc()).limit(5).all()
    recent_know = db.query(KnowledgePost).filter(KnowledgePost.user_id == user_id).order_by(KnowledgePost.created_at.desc()).limit(5).all()

    activities = []
    
    for inv in recent_invs:
        action = "Investigation updated" if inv.updated_at > inv.created_at else "Investigation created"
        if inv.status == "Archived":
            action = "Investigation archived"
        activities.append(ActivityItemSchema(
            id=f"inv-{inv.id}",
            type="investigation",
            title=action,
            detail=inv.title,
            timestamp=inv.updated_at
        ))
        
    for doc in recent_docs:
        activities.append(ActivityItemSchema(
            id=f"doc-{doc.id}",
            type="document",
            title="Document uploaded",
            detail=doc.title,
            timestamp=doc.uploaded_at
        ))
        
    for run in recent_runs:
        activities.append(ActivityItemSchema(
            id=f"run-{run.id}",
            type="agent_run",
            title="Agent run completed" if run.status == "completed" else "Agent run started",
            detail=f"Query: {run.question[:50]}...",
            timestamp=run.created_at
        ))
        
    for post in recent_know:
        activities.append(ActivityItemSchema(
            id=f"know-{post.id}",
            type="knowledge",
            title="Knowledge shared",
            detail=post.title,
            timestamp=post.created_at
        ))

    # Sort descending by timestamp and take top 5
    activities.sort(key=lambda x: x.timestamp, reverse=True)
    recent_activity = activities[:5]

    return WorkspaceOverviewResponse(
        metrics=metrics,
        active_investigations=active_invs,
        recent_activity=recent_activity
    )
