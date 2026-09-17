from datetime import datetime

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


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
