from datetime import datetime

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ResearchQuery(Base):
    __tablename__ = "research_queries"

    id: Mapped[int] = mapped_column(primary_key=True)

    question: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="Pending",
    )

    created_at: Mapped[datetime | None] = mapped_column(
        nullable=True,
        server_default="CURRENT_TIMESTAMP",
    )