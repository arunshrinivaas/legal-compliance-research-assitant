from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import Optional

from app.database import get_db
from app.routers.auth import get_current_user
from app.schemas.agent import AgentRunRequest, AgentRunResponse
from app.services.agent_service import run_compliance_investigation
from app.models.user import User
from app.models.agent_run import AgentRun

router = APIRouter(
    prefix="/api/v1/agents",
    tags=["Agents"],
)

@router.post(
    "/investigations/{investigation_id}/run",
    response_model=AgentRunResponse,
    status_code=status.HTTP_201_CREATED,
)
async def run_agent(
    investigation_id: int,
    request: AgentRunRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not request.question or not request.question.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty",
        )

    try:
        agent_run = await run_compliance_investigation(
            db=db,
            investigation_id=investigation_id,
            user_id=current_user.id,
            question=request.question.strip(),
        )
        return agent_run
    except ValueError as e:
        # e.g. Investigation not found
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during agent execution",
        )

@router.get(
    "/runs",
    response_model=list[AgentRunResponse],
    status_code=status.HTTP_200_OK,
)
async def list_agent_runs(
    investigation_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(AgentRun).where(AgentRun.user_id == current_user.id)
    if investigation_id is not None:
        query = query.where(AgentRun.investigation_id == investigation_id)
    
    query = query.order_by(AgentRun.created_at.desc())
    runs = db.execute(query).scalars().all()
    
    for run in runs:
        run.evidence = run.evidence or []
        run.conflicts = run.conflicts or []
        run.evidence_gaps = run.evidence_gaps or []
        run.applicable_requirements = run.applicable_requirements or []
        run.suggested_actions = run.suggested_actions or []
        run.citations = run.citations or []
        
    return runs

