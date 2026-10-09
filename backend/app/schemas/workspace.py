from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional

class MetricCards(BaseModel):
    active_investigations: int
    total_documents: int
    total_agent_runs: int

class ActivityItemSchema(BaseModel):
    id: str
    type: str # 'investigation', 'document', 'agent_run', 'knowledge'
    title: str
    detail: str
    timestamp: datetime

class ActiveInvestigationSchema(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    status: str
    updated_at: datetime
    documents_count: int
    agent_runs_count: int

class WorkspaceOverviewResponse(BaseModel):
    metrics: MetricCards
    active_investigations: List[ActiveInvestigationSchema]
    recent_activity: List[ActivityItemSchema]
