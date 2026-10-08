from datetime import datetime

from pydantic import BaseModel


class DocumentCreate(BaseModel):
    title: str
    filename: str
    document_type: str
    jurisdiction: str
    description: str | None = None
    user_id: int


class DocumentResponse(BaseModel):
    id: int
    title: str
    filename: str
    document_type: str
    jurisdiction: str
    description: str | None = None
    user_id: int
    uploaded_at: datetime | None = None
    