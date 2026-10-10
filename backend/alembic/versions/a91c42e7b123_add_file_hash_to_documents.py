from alembic import op
import sqlalchemy as sa


revision = "a91c42e7b123"
down_revision = "08736cdc4155"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "documents",
        sa.Column("file_hash", sa.String(length=64), nullable=True),
    )

    op.create_index(
        "ix_documents_file_hash",
        "documents",
        ["file_hash"],
        unique=False,
    )


def downgrade():
    op.drop_index(
        "ix_documents_file_hash",
        table_name="documents",
    )

    op.drop_column(
        "documents",
        "file_hash",
    )