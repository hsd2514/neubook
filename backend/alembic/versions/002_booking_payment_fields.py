"""add booking payment fields

Revision ID: 002
Revises: 001
Create Date: 2026-05-02
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "bookings",
        sa.Column("payment_status", sa.String(length=32), nullable=False, server_default="not_required"),
    )
    op.add_column("bookings", sa.Column("payment_reference", sa.String(length=128), nullable=True))


def downgrade() -> None:
    op.drop_column("bookings", "payment_reference")
    op.drop_column("bookings", "payment_status")

