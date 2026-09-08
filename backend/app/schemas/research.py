from datetime import datetime

from pydantic import BaseModel


class ResearchQueryCreate(BaseModel):
    question: str
    status: str = "Pending"


class ResearchQueryResponse(BaseModel):
    id: int
    question: str
    status: str
    created_at: datetime | None = None