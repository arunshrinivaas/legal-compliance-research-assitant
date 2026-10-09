from datetime import datetime
from pydantic import BaseModel


class PolicyCreate(BaseModel):
    title: str
    department: str
    description: str | None = None
    status: str = "Draft"
    version: str = "1.0"
    effective_date: datetime | None = None


class PolicyUpdate(BaseModel):
    title: str | None = None
    department: str | None = None
    description: str | None = None
    status: str | None = None
    version: str | None = None
    effective_date: datetime | None = None
