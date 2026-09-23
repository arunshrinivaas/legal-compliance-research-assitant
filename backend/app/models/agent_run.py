from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.investigation import Investigation


class AgentRun(Base):
    """
    Immutable execution/audit record for one run of the Compliance
    Investigation Agent against a specific Investigation.

    Lifecycle:  pending → completed | failed

    An Investigation can have many AgentRuns.
    AgentRun is append-only; it is never mutated after creation.
    """

    __tablename__ = "agent_runs"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    investigation_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("investigations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # The compliance question posed to the agent for this run.
    question: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    # Run lifecycle status.
    # Values: "pending" | "completed" | "failed"
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="pending",
    )

    # ----------------------------------------------------------------
    # Structured output fields — populated on completion.
    # All nullable because they are absent while status == "pending"
    # or when status == "failed".
    # Stored as JSON arrays/objects for schema flexibility.
    # ----------------------------------------------------------------

    # Free-text overall compliance finding.
    finding: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # list[AgentEvidence]
    evidence: Mapped[list | None] = mapped_column(
        JSON,
        nullable=True,
    )

    # list[AgentConflict]
    conflicts: Mapped[list | None] = mapped_column(
        JSON,
        nullable=True,
    )

    # list[AgentEvidenceGap]
    evidence_gaps: Mapped[list | None] = mapped_column(
        JSON,
        nullable=True,
    )

    # list[AgentRequirement]
    applicable_requirements: Mapped[list | None] = mapped_column(
        JSON,
        nullable=True,
    )

    # list[AgentAction]
    suggested_actions: Mapped[list | None] = mapped_column(
        JSON,
        nullable=True,
    )

    # list[AgentCitation]
    citations: Mapped[list | None] = mapped_column(
        JSON,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # ----------------------------------------------------------------
    # Relationships
    # ----------------------------------------------------------------

    investigation: Mapped["Investigation"] = relationship(
        "Investigation",
        back_populates="agent_runs",
    )
