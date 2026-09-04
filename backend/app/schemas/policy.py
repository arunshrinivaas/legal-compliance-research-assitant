from datetime import datetime

from pydantic import BaseModel


class PolicyCreate(BaseModel):
    title: str
    department: str
    description: str | None = None
    status: str = "Active"
    version: str = "1.0"
    effective_date: datetime | None = None