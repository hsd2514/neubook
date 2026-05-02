"""add blocked slots table

Revision ID: 006
Revises: 005
Create Date: 2026-05-02
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "blocked_slots",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("appointment_type_id", sa.Integer(), sa.ForeignKey("appointment_types.id"), nullable=False),
        sa.Column("resource_id", sa.Integer(), sa.ForeignKey("resources.id"), nullable=True),
        sa.Column("block_type", sa.String(length=32), nullable=False, server_default="one_off"),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("day_of_week", sa.Integer(), nullable=True),
        sa.Column("start_time", sa.Time(), nullable=True),
        sa.Column("end_time", sa.Time(), nullable=True),
    )
    op.create_index("ix_blocked_slots_appointment_type_id", "blocked_slots", ["appointment_type_id"])
    op.create_index("ix_blocked_slots_resource_id", "blocked_slots", ["resource_id"])


def downgrade() -> None:
    op.drop_index("ix_blocked_slots_resource_id", table_name="blocked_slots")
    op.drop_index("ix_blocked_slots_appointment_type_id", table_name="blocked_slots")
    op.drop_table("blocked_slots")
