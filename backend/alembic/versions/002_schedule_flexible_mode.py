"""add flexible schedule columns

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
    op.add_column("schedules", sa.Column("schedule_mode", sa.String(length=32), nullable=True))
    op.add_column("schedules", sa.Column("slot_date", sa.Date(), nullable=True))

    op.execute("UPDATE schedules SET schedule_mode = 'weekly' WHERE schedule_mode IS NULL")

    op.alter_column("schedules", "schedule_mode", existing_type=sa.String(length=32), nullable=False)
    op.alter_column("schedules", "day_of_week", existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    op.alter_column("schedules", "day_of_week", existing_type=sa.Integer(), nullable=False)
    op.drop_column("schedules", "slot_date")
    op.drop_column("schedules", "schedule_mode")
