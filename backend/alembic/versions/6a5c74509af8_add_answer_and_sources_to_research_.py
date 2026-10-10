"""add_answer_and_sources_to_research_queries

Revision ID: 6a5c74509af8
Revises: cb366a166bd7
Create Date: 2026-10-10 20:10:01.126181

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6a5c74509af8'
down_revision: Union[str, Sequence[str], None] = 'cb366a166bd7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    insp = sa.inspect(conn)
    columns = [c['name'] for c in insp.get_columns('research_queries')]
    
    if 'answer' not in columns:
        op.add_column('research_queries', sa.Column('answer', sa.Text(), nullable=True))
    
    if 'sources' not in columns:
        # SQLite doesn't natively support JSONB in all drivers, so we use JSON for cross-compatibility
        # which maps to JSON in SQLAlchemy for sqlite, and JSONB or JSON for postgres.
        # But we can just use sa.JSON() here safely.
        op.add_column('research_queries', sa.Column('sources', sa.JSON(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # We do not automatically drop these columns during downgrade to prevent accidental data loss 
    # for columns that might have existed prior to this migration or contain production data.
    # If a hard rollback is explicitly required, uncomment the following block:
    #
    # conn = op.get_bind()
    # insp = sa.inspect(conn)
    # columns = [c['name'] for c in insp.get_columns('research_queries')]
    # if 'answer' in columns:
    #     op.drop_column('research_queries', 'answer')
    # if 'sources' in columns:
    #     op.drop_column('research_queries', 'sources')
    pass
