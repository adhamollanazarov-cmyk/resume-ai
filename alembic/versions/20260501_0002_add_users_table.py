"""add users table

Revision ID: 20260501_0002
Revises: 20260429_0001
Create Date: 2026-05-01 11:55:00

"""

from alembic import op
import sqlalchemy as sa


revision = "20260501_0002"
down_revision = "20260429_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("image", sa.Text(), nullable=True),
        sa.Column("plan", sa.String(length=32), nullable=False, server_default="free"),
        sa.Column("analysis_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("TIMEZONE('utc', now())"),
        ),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
