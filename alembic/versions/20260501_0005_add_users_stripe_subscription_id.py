"""add users stripe subscription id

Revision ID: 20260501_0005
Revises: 20260501_0004
Create Date: 2026-05-01 23:30:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260501_0005"
down_revision = "20260501_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("stripe_subscription_id", sa.String(length=255), nullable=True))
    op.create_index("ix_users_stripe_subscription_id", "users", ["stripe_subscription_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_stripe_subscription_id", table_name="users")
    op.drop_column("users", "stripe_subscription_id")
