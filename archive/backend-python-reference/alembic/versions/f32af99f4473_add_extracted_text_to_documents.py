"""add extracted text to documents

Revision ID: f32af99f4473
Revises: 28eb51cfa52a
Create Date: 2026-09-08 10:23:23.973016

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f32af99f4473'
down_revision: Union[str, Sequence[str], None] = '28eb51cfa52a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "documents",
        sa.Column("extracted_text", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("documents", "extracted_text")
