"""add_role_isactive_to_users

Revision ID: fa0db8d21b2b
Revises: 2b568f6002d9
Create Date: 2026-09-09 13:30:27.022329
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'fa0db8d21b2b'
down_revision: Union[str, Sequence[str], None] = '2b568f6002d9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column(
        'role', sa.String(length=50),
        nullable=False,
        server_default='viewer',
    ))
    op.add_column('users', sa.Column(
        'is_active', sa.Boolean(),
        nullable=False,
        server_default='true',
    ))
    op.add_column('users', sa.Column(
        'updated_at', sa.DateTime(),
        server_default=sa.text('now()'),
        nullable=True,
    ))


def downgrade() -> None:
    op.drop_column('users', 'updated_at')
    op.drop_column('users', 'is_active')
    op.drop_column('users', 'role')
