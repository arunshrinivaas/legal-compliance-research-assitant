from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.agent_run import AgentRun


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(
        String(50), nullable=False, default="viewer"
    )
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True)
    created_at: Mapped[datetime | None] = mapped_column(
        nullable=True,
        server_default="CURRENT_TIMESTAMP",
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        nullable=True,
        server_default="CURRENT_TIMESTAMP",
        onupdate=datetime.utcnow,
    )

    agent_runs: Mapped[list["AgentRun"]] = relationship(
        "AgentRun",
        foreign_keys="[AgentRun.user_id]",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
