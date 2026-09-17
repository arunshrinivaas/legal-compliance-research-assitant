"""add investigation document association

Revision ID: 08736cdc4155
Revises: 59fe5b4888e9
Create Date: 2026-09-14
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "08736cdc4155"
down_revision: Union[str, Sequence[str], None] = "59fe5b4888e9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "investigation_documents",
        sa.Column(
            "investigation_id",
            sa.Integer(),
            sa.ForeignKey("investigations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "document_id",
            sa.Integer(),
            sa.ForeignKey("documents.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint(
            "investigation_id",
            "document_id",
        ),
    )

    op.create_index(
        "ix_investigation_documents_investigation_id",
        "investigation_documents",
        ["investigation_id"],
    )

    op.create_index(
        "ix_investigation_documents_document_id",
        "investigation_documents",
        ["document_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_investigation_documents_document_id",
        table_name="investigation_documents",
    )

    op.drop_index(
        "ix_investigation_documents_investigation_id",
        table_name="investigation_documents",
    )

    op.drop_table("investigation_documents")