"""add mfa fields to users

Revision ID: 5c8e2b7a9f14
Revises: 8f2cb633b412
Create Date: 2026-09-30 16:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5c8e2b7a9f14'
down_revision: Union[str, Sequence[str], None] = '8f2cb633b412'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('mfa_enabled', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('users', sa.Column('totp_secret', sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'totp_secret')
    op.drop_column('users', 'mfa_enabled')
