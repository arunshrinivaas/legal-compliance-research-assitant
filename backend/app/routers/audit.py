"""
Audit & Findings read-only aggregation router.

All endpoints:
  - are read-only (GET only)
  - require authentication
  - are strictly user-scoped (current_user.id is always enforced)
  - are deterministic (no side effects)
  - derive data exclusively from existing persisted records
    (AgentRun, InvestigationQuery, KnowledgePost, Investigation, Document)

No new persistence models are introduced.
"""

from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.agent_run import AgentRun
from app.models.investigation import Investigation
from app.models.investigation_query import InvestigationQuery
from app.models.knowledge_post import KnowledgePost
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/v1/audit", tags=["Audit"])


# =========================================================
# Response schemas (inline — no separate schema file needed
# since these aggregate multiple models)
# =========================================================


class FindingResponse(BaseModel):
    id: int
    investigation_id: int
    investigation_title: str
    question: str
    status: str  # "pending" | "completed" | "failed"
    finding: str | None
    evidence: list | None
    conflicts: list | None
    evidence_gaps: list | None
    applicable_requirements: list | None
    suggested_actions: list | None
    citations: list | None
    created_at: datetime

    model_config = {"from_attributes": True}


class TimelineEventType(str):
    pass


class TimelineEvent(BaseModel):
    id: str                          # e.g. "run-5", "query-12", "post-3"
    event_type: str                  # "agent_finding" | "rag_query" | "knowledge_shared"
    investigation_id: int | None
    investigation_title: str | None
    title: str
    detail: str | None
    status: str | None               # present for agent_finding
    timestamp: datetime


class FindingsPage(BaseModel):
    total: int
    items: list[FindingResponse]


class TimelinePage(BaseModel):
    total: int
    items: list[TimelineEvent]


# =========================================================
# Findings endpoint
# =========================================================


@router.get("/findings", response_model=FindingsPage)
def list_findings(
    investigation_id: int | None = Query(None, description="Filter by investigation"),
    status: str | None = Query(None, description="Filter by status: pending, completed, failed"),
    search: str | None = Query(None, description="Search question text"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Returns AgentRun records (findings) for the current user.
    Each record is enriched with the parent investigation title.
    """
    stmt = (
        select(AgentRun, Investigation.title.label("inv_title"))
        .join(Investigation, Investigation.id == AgentRun.investigation_id)
        .where(AgentRun.user_id == current_user.id)
    )

    if investigation_id is not None:
        stmt = stmt.where(AgentRun.investigation_id == investigation_id)

    if status:
        stmt = stmt.where(AgentRun.status == status)

    if search:
        stmt = stmt.where(AgentRun.question.ilike(f"%{search}%"))

    # Total count for pagination
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(count_stmt) or 0

    rows = db.execute(
        stmt.order_by(AgentRun.created_at.desc()).limit(limit).offset(offset)
    ).all()

    items = [
        FindingResponse(
            id=run.id,
            investigation_id=run.investigation_id,
            investigation_title=inv_title,
            question=run.question,
            status=run.status,
            finding=run.finding,
            evidence=run.evidence or [],
            conflicts=run.conflicts or [],
            evidence_gaps=run.evidence_gaps or [],
            applicable_requirements=run.applicable_requirements or [],
            suggested_actions=run.suggested_actions or [],
            citations=run.citations or [],
            created_at=run.created_at,
        )
        for run, inv_title in rows
    ]

    return FindingsPage(total=total, items=items)


# =========================================================
# Timeline endpoint (audit trail)
# =========================================================


@router.get("/timeline", response_model=TimelinePage)
def get_audit_timeline(
    investigation_id: int | None = Query(None, description="Scope to a specific investigation"),
    event_type: str | None = Query(
        None,
        description="Filter: agent_finding | rag_query | knowledge_shared",
    ),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Read-only audit timeline aggregating:
      - AgentRun records (agent_finding)
      - InvestigationQuery records (rag_query)
      - KnowledgePost records (knowledge_shared)

    All records are strictly scoped to current_user.id.
    Investigation titles are resolved from the investigations table.
    """
    events: list[TimelineEvent] = []

    # --------------------------------------------------------
    # Pre-fetch investigation titles for the user (single query)
    # --------------------------------------------------------
    inv_title_map: dict[int, str] = {
        inv.id: inv.title
        for inv in db.scalars(
            select(Investigation).where(Investigation.user_id == current_user.id)
        ).all()
    }

    # --------------------------------------------------------
    # 1. Agent findings (AgentRun)
    # --------------------------------------------------------
    if event_type is None or event_type == "agent_finding":
        run_stmt = select(AgentRun).where(AgentRun.user_id == current_user.id)
        if investigation_id is not None:
            run_stmt = run_stmt.where(AgentRun.investigation_id == investigation_id)

        for run in db.scalars(run_stmt).all():
            events.append(
                TimelineEvent(
                    id=f"run-{run.id}",
                    event_type="agent_finding",
                    investigation_id=run.investigation_id,
                    investigation_title=inv_title_map.get(run.investigation_id),
                    title="Agent analysis",
                    detail=run.question[:120] + ("…" if len(run.question) > 120 else ""),
                    status=run.status,
                    timestamp=run.created_at,
                )
            )

    # --------------------------------------------------------
    # 2. RAG / Investigation queries (InvestigationQuery)
    # --------------------------------------------------------
    if event_type is None or event_type == "rag_query":
        # InvestigationQuery has no user_id — scope via investigations the user owns
        user_inv_ids = list(inv_title_map.keys())
        if user_inv_ids:
            iq_stmt = select(InvestigationQuery).where(
                InvestigationQuery.investigation_id.in_(user_inv_ids)
            )
            if investigation_id is not None:
                iq_stmt = iq_stmt.where(
                    InvestigationQuery.investigation_id == investigation_id
                )

            for iq in db.scalars(iq_stmt).all():
                events.append(
                    TimelineEvent(
                        id=f"query-{iq.id}",
                        event_type="rag_query",
                        investigation_id=iq.investigation_id,
                        investigation_title=inv_title_map.get(iq.investigation_id),
                        title="RAG query",
                        detail=iq.question[:120] + ("…" if len(iq.question) > 120 else ""),
                        status=None,
                        timestamp=iq.created_at,
                    )
                )

    # --------------------------------------------------------
    # 3. Knowledge shared (KnowledgePost)
    # --------------------------------------------------------
    if event_type is None or event_type == "knowledge_shared":
        kp_stmt = select(KnowledgePost).where(
            KnowledgePost.user_id == current_user.id
        )
        if investigation_id is not None:
            kp_stmt = kp_stmt.where(
                KnowledgePost.investigation_id == investigation_id
            )

        for kp in db.scalars(kp_stmt).all():
            events.append(
                TimelineEvent(
                    id=f"post-{kp.id}",
                    event_type="knowledge_shared",
                    investigation_id=kp.investigation_id,
                    investigation_title=inv_title_map.get(kp.investigation_id)
                    if kp.investigation_id
                    else None,
                    title="Knowledge shared",
                    detail=kp.title,
                    status=None,
                    timestamp=kp.created_at,
                )
            )

    # --------------------------------------------------------
    # Sort descending, apply limit
    # --------------------------------------------------------
    events.sort(key=lambda e: e.timestamp, reverse=True)
    total = len(events)
    items = events[:limit]

    return TimelinePage(total=total, items=items)


# =========================================================
# Summary stats endpoint (for header KPIs)
# =========================================================


@router.get("/summary")
def get_audit_summary(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Lightweight stats for the Audit & Findings header KPIs.
    All values are counts of persisted records scoped to current_user.
    """
    user_id = current_user.id

    total_findings = db.scalar(
        select(func.count(AgentRun.id)).where(AgentRun.user_id == user_id)
    ) or 0

    completed_findings = db.scalar(
        select(func.count(AgentRun.id)).where(
            AgentRun.user_id == user_id,
            AgentRun.status == "completed",
        )
    ) or 0

    failed_findings = db.scalar(
        select(func.count(AgentRun.id)).where(
            AgentRun.user_id == user_id,
            AgentRun.status == "failed",
        )
    ) or 0

    # InvestigationQuery count — via owned investigations
    inv_ids = db.scalars(
        select(Investigation.id).where(Investigation.user_id == user_id)
    ).all()

    rag_query_count = 0
    if inv_ids:
        rag_query_count = db.scalar(
            select(func.count(InvestigationQuery.id)).where(
                InvestigationQuery.investigation_id.in_(inv_ids)
            )
        ) or 0

    knowledge_shared = db.scalar(
        select(func.count(KnowledgePost.id)).where(
            KnowledgePost.user_id == user_id
        )
    ) or 0

    return {
        "total_findings": total_findings,
        "completed_findings": completed_findings,
        "failed_findings": failed_findings,
        "rag_query_count": rag_query_count,
        "knowledge_shared": knowledge_shared,
    }
