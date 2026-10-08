"""baseline users table

Revision ID: b17cfbb41bd0
Revises:
Create Date: 2026-09-04
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "b17cfbb41bd0"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Mark the existing users table as the initial baseline."""
    pass


def downgrade() -> None:
    """No schema changes to reverse."""
    pass
