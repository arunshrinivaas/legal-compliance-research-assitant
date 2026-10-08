from datetime import datetime

from pydantic import BaseModel


class ComplianceCreate(BaseModel):
    title: str
    regulation: str
    description: str | None = None
    department: str
    status: str = "Not Started"
    risk_level: str = "Medium"
    due_date: datetime | None = None