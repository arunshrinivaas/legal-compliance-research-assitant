from pydantic import BaseModel, ConfigDict
from datetime import datetime
from app.schemas.auth import UserResponse

class KnowledgePostCreate(BaseModel):
    title: str
    content: str
    source_citation: str | None = None
    investigation_id: int | None = None

class KnowledgePostResponse(BaseModel):
    id: int
    user_id: int
    title: str
    content: str
    source_citation: str | None = None
    investigation_id: int | None = None
    created_at: datetime
    author: UserResponse

    model_config = ConfigDict(from_attributes=True)
