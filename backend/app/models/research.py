from sqlalchemy import text
from datetime import datetime

from sqlalchemy import String, Text, JSON
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

    answer: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    sources: Mapped[list | None] = mapped_column(
        JSON,
        nullable=True,
    )

    created_at: Mapped[datetime | None] = mapped_column(
        nullable=True,
        server_default=text("CURRENT_TIMESTAMP"),
    )