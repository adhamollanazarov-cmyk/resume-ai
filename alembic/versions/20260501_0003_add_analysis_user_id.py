"""add analysis user_id

Revision ID: 20260501_0003
Revises: 20260501_0002
Create Date: 2026-05-01 14:40:00

"""

from alembic import op
import sqlalchemy as sa


revision = "20260501_0003"
down_revision = "20260501_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("analyses", sa.Column("user_id", sa.Integer(), nullable=True))
    op.create_index("ix_analyses_user_id", "analyses", ["user_id"], unique=False)
    op.create_foreign_key(
        "fk_analyses_user_id_users",
        "analyses",
        "users",
        ["user_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_analyses_user_id_users", "analyses", type_="foreignkey")
    op.drop_index("ix_analyses_user_id", table_name="analyses")
    op.drop_column("analyses", "user_id")
