"""add_google_oauth_fields_to_users

Adds google_id (unique, nullable), email_verified (boolean, default false),
and makes password_hash nullable to support Google-only accounts.

Revision ID: f8cec2da480b
Revises: 5c8e2b7a9f14
Create Date: 2026-09-30 22:30:34.349546

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f8cec2da480b'
down_revision: Union[str, Sequence[str], None] = '5c8e2b7a9f14'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add Google OAuth fields to users table."""
    op.add_column('users', sa.Column('google_id', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('email_verified', sa.Boolean(), server_default='false', nullable=False))
    op.alter_column('users', 'password_hash',
               existing_type=sa.VARCHAR(length=255),
               nullable=True)
    op.create_unique_constraint('uq_users_google_id', 'users', ['google_id'])


def downgrade() -> None:
    """Remove Google OAuth fields from users table."""
    op.drop_constraint('uq_users_google_id', 'users', type_='unique')
    op.alter_column('users', 'password_hash',
               existing_type=sa.VARCHAR(length=255),
               nullable=False)
    op.drop_column('users', 'email_verified')
    op.drop_column('users', 'google_id')
