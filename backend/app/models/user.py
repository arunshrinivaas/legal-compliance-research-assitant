from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.agent_run import AgentRun


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    # Nullable: Google-only accounts have no local password.
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(
        String(50), nullable=False, default="viewer"
    )
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True)
    mfa_enabled: Mapped[bool] = mapped_column(
        nullable=False, default=False, server_default="false"
    )
    totp_secret: Mapped[str | None] = mapped_column(
        String(255), nullable=True, default=None
    )
    # Google OAuth fields
    google_id: Mapped[str | None] = mapped_column(
        String(255), unique=True, nullable=True, default=None
    )
    # Apple OAuth fields
    apple_id: Mapped[str | None] = mapped_column(
        String(255), unique=True, nullable=True, default=None
    )
    # Phone OTP fields
    phone_number: Mapped[str | None] = mapped_column(
        String(20), unique=True, nullable=True, default=None
    )
    email_verified: Mapped[bool] = mapped_column(
        nullable=False, default=False, server_default="false"
    )
    created_at: Mapped[datetime | None] = mapped_column(
        nullable=True,
        server_default=text("CURRENT_TIMESTAMP"),
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        nullable=True,
        server_default=text("CURRENT_TIMESTAMP"),
        onupdate=datetime.utcnow,
    )

    agent_runs: Mapped[list["AgentRun"]] = relationship(
        "AgentRun",
        foreign_keys="[AgentRun.user_id]",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
