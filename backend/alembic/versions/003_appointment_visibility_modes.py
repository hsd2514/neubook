"""add appointment visibility modes

Revision ID: 004
Revises: 003
Create Date: 2026-05-02

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("appointment_types", sa.Column("visibility", sa.String(length=32), nullable=True))
    op.execute("UPDATE appointment_types SET visibility = 'public' WHERE visibility IS NULL")
    op.alter_column("appointment_types", "visibility", existing_type=sa.String(length=32), nullable=False)


def downgrade() -> None:
    op.drop_column("appointment_types", "visibility")
