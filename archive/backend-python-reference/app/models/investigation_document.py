from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class InvestigationDocument(Base):
    __tablename__ = "investigation_documents"

    investigation_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("investigations.id", ondelete="CASCADE"),
        primary_key=True,
    )

    document_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("documents.id", ondelete="CASCADE"),
        primary_key=True,
    )