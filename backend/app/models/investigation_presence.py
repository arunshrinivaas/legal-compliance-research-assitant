from sqlalchemy import Column, Integer, ForeignKey, DateTime
from datetime import datetime, timezone
from app.models.base import Base

class InvestigationPresence(Base):
    __tablename__ = "investigation_presence"

    id = Column(Integer, primary_key=True, index=True)
    investigation_id = Column(Integer, ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    last_seen_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
