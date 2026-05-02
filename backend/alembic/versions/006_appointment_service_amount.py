"""add service amount per appointment type

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
    op.add_column(
        "appointment_types",
        sa.Column("service_amount_paisa", sa.Integer(), nullable=False, server_default="100"),
    )
    op.alter_column("appointment_types", "service_amount_paisa", server_default=None)


def downgrade() -> None:
    op.drop_column("appointment_types", "service_amount_paisa")
