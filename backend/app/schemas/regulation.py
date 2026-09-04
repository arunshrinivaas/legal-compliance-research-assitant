from datetime import datetime

from pydantic import BaseModel


class RegulationCreate(BaseModel):
    title: str
    issuing_authority: str
    jurisdiction: str
    description: str | None = None
    status: str = "Active"
    effective_date: datetime | None = None