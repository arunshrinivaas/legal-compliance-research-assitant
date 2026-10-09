"""
Governance summary read-only router.

Aggregates data from:
  - Policies (global — no user_id on the model)
  - Regulations (global — no user_id on the model)
  - Compliance obligations (global — no user_id on the model)
  - AgentRun findings (user-scoped via user_id)
  - Investigations (user-scoped via user_id)

All endpoints are:
  - read-only (GET only)
  - authenticated
  - deterministic
  - derived exclusively from persisted records
  - no new persistence models
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.agent_run import AgentRun
from app.models.compliance import Compliance
from app.models.investigation import Investigation
from app.models.policy import Policy
from app.models.regulation import Regulation
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/v1/governance", tags=["Governance"])


# =========================================================
# Governance summary — single call to power KPI cards
# =========================================================


@router.get("/summary")
def get_governance_summary(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Returns cross-cutting governance KPIs derived from persisted records.

    Policies and Regulations are global (no user_id column).
    Compliance is global (no user_id column).
    AgentRun findings and Investigations are user-scoped.
    """

    # ------- Policies -------
    total_policies = db.scalar(select(func.count(Policy.id))) or 0
    active_policies = db.scalar(
        select(func.count(Policy.id)).where(Policy.status == "Active")
    ) or 0
    draft_policies = db.scalar(
        select(func.count(Policy.id)).where(Policy.status == "Draft")
    ) or 0

    # ------- Regulations -------
    total_regulations = db.scalar(select(func.count(Regulation.id))) or 0
    active_regulations = db.scalar(
        select(func.count(Regulation.id)).where(Regulation.status == "Active")
    ) or 0

    # ------- Compliance obligations -------
    total_obligations = db.scalar(select(func.count(Compliance.id))) or 0
    compliant_count = db.scalar(
        select(func.count(Compliance.id)).where(Compliance.status == "Compliant")
    ) or 0
    non_compliant_count = db.scalar(
        select(func.count(Compliance.id)).where(Compliance.status == "Non-Compliant")
    ) or 0
    high_risk_count = db.scalar(
        select(func.count(Compliance.id)).where(Compliance.risk_level == "High")
    ) or 0
    compliance_score = (
        round((compliant_count / total_obligations) * 100) if total_obligations else 0
    )

    # ------- Investigations (user-scoped) -------
    total_investigations = db.scalar(
        select(func.count(Investigation.id)).where(
            Investigation.user_id == current_user.id
        )
    ) or 0
    active_investigations = db.scalar(
        select(func.count(Investigation.id)).where(
            Investigation.user_id == current_user.id,
            Investigation.status == "Active",
        )
    ) or 0

    # ------- Agent findings (user-scoped) -------
    total_findings = db.scalar(
        select(func.count(AgentRun.id)).where(AgentRun.user_id == current_user.id)
    ) or 0
    completed_findings = db.scalar(
        select(func.count(AgentRun.id)).where(
            AgentRun.user_id == current_user.id,
            AgentRun.status == "completed",
        )
    ) or 0
    failed_findings = db.scalar(
        select(func.count(AgentRun.id)).where(
            AgentRun.user_id == current_user.id,
            AgentRun.status == "failed",
        )
    ) or 0

    return {
        "policies": {
            "total": total_policies,
            "active": active_policies,
            "draft": draft_policies,
        },
        "regulations": {
            "total": total_regulations,
            "active": active_regulations,
        },
        "compliance": {
            "total_obligations": total_obligations,
            "compliant": compliant_count,
            "non_compliant": non_compliant_count,
            "high_risk": high_risk_count,
            "score": compliance_score,
        },
        "investigations": {
            "total": total_investigations,
            "active": active_investigations,
        },
        "findings": {
            "total": total_findings,
            "completed": completed_findings,
            "failed": failed_findings,
        },
    }


# =========================================================
# Policy register — lightweight list for governance view
# =========================================================


@router.get("/policies")
def get_governance_policies(
    status: str | None = Query(None),
    department: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Returns policies for the governance register view.
    Policies are global (no user_id). Auth is still required to access governance.
    """
    stmt = select(Policy)
    if status:
        stmt = stmt.where(Policy.status == status)
    if department:
        stmt = stmt.where(Policy.department.ilike(f"%{department}%"))

    policies = db.scalars(stmt.order_by(Policy.created_at.desc()).limit(limit)).all()
    total = db.scalar(select(func.count(Policy.id))) or 0

    return {
        "total": total,
        "items": [
            {
                "id": p.id,
                "title": p.title,
                "department": p.department,
                "status": p.status,
                "version": p.version,
                "effective_date": p.effective_date,
                "created_at": p.created_at,
            }
            for p in policies
        ],
    }


# =========================================================
# Regulation register — lightweight list for governance view
# =========================================================


@router.get("/regulations")
def get_governance_regulations(
    status: str | None = Query(None),
    jurisdiction: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Returns regulations for the governance register view.
    Regulations are global (no user_id). Auth is still required.
    """
    stmt = select(Regulation)
    if status:
        stmt = stmt.where(Regulation.status == status)
    if jurisdiction:
        stmt = stmt.where(Regulation.jurisdiction.ilike(f"%{jurisdiction}%"))

    regs = db.scalars(stmt.order_by(Regulation.created_at.desc()).limit(limit)).all()
    total = db.scalar(select(func.count(Regulation.id))) or 0

    return {
        "total": total,
        "items": [
            {
                "id": r.id,
                "title": r.title,
                "issuing_authority": r.issuing_authority,
                "jurisdiction": r.jurisdiction,
                "status": r.status,
                "effective_date": r.effective_date,
                "created_at": r.created_at,
            }
            for r in regs
        ],
    }


# =========================================================
# Compliance risk register — obligations grouped by risk/status
# =========================================================


@router.get("/compliance-risk")
def get_governance_compliance_risk(
    risk_level: str | None = Query(None),
    status: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Returns compliance obligations for the risk register view.
    Compliance table is global (no user_id). Auth still required.
    """
    stmt = select(Compliance)
    if risk_level:
        stmt = stmt.where(Compliance.risk_level == risk_level)
    if status:
        stmt = stmt.where(Compliance.status == status)

    items = db.scalars(
        stmt.order_by(Compliance.risk_level, Compliance.due_date).limit(limit)
    ).all()
    total = db.scalar(select(func.count(Compliance.id))) or 0

    return {
        "total": total,
        "items": [
            {
                "id": c.id,
                "title": c.title,
                "regulation": c.regulation,
                "department": c.department,
                "status": c.status,
                "risk_level": c.risk_level,
                "due_date": c.due_date,
                "created_at": c.created_at,
            }
            for c in items
        ],
    }
