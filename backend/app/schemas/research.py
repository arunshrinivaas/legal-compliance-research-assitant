from datetime import datetime

from pydantic import BaseModel


class ResearchQueryCreate(BaseModel):
    question: str
    status: str = "Pending"
    answer: str | None = None
    sources: list | None = None


class ResearchQueryResponse(BaseModel):
    id: int
    question: str
    status: str
    answer: str | None = None
    sources: list | None = None
    created_at: datetime | None = None