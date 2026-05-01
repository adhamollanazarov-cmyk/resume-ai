"""add users stripe customer id

Revision ID: 20260501_0004
Revises: 20260501_0003
Create Date: 2026-05-01 20:10:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260501_0004"
down_revision = "20260501_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("stripe_customer_id", sa.String(length=255), nullable=True))
    op.create_index("ix_users_stripe_customer_id", "users", ["stripe_customer_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_stripe_customer_id", table_name="users")
    op.drop_column("users", "stripe_customer_id")
