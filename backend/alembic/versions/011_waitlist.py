"""add waitlist_entries table

Revision ID: 011
Revises: 010
Create Date: 2026-05-03
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "011"
down_revision: Union[str, None] = "010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "waitlist_entries" not in tables:
        op.create_table(
            "waitlist_entries",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("customer_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("appointment_type_id", sa.Integer(), sa.ForeignKey("appointment_types.id"), nullable=False),
            sa.Column("resource_id", sa.Integer(), sa.ForeignKey("resources.id"), nullable=True),
            sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
            sa.Column("seat_ids", sa.JSON(), nullable=True),
            sa.Column("answers", sa.JSON(), nullable=True),
            sa.Column("position", sa.Integer(), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="waiting"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        )

    indexes = {
        idx["name"]
        for idx in inspector.get_indexes("waitlist_entries")
    } if "waitlist_entries" in set(inspector.get_table_names()) else set()

    if "ix_waitlist_entries_customer_id" not in indexes:
        op.create_index("ix_waitlist_entries_customer_id", "waitlist_entries", ["customer_id"])
    if "ix_waitlist_entries_appointment_type_id" not in indexes:
        op.create_index("ix_waitlist_entries_appointment_type_id", "waitlist_entries", ["appointment_type_id"])
    if "ix_waitlist_entries_start_time" not in indexes:
        op.create_index("ix_waitlist_entries_start_time", "waitlist_entries", ["start_time"])
    if "ix_waitlist_entries_resource_id" not in indexes:
        op.create_index("ix_waitlist_entries_resource_id", "waitlist_entries", ["resource_id"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "waitlist_entries" in tables:
        indexes = {idx["name"] for idx in inspector.get_indexes("waitlist_entries")}
        for idx in [
            "ix_waitlist_entries_resource_id",
            "ix_waitlist_entries_start_time",
            "ix_waitlist_entries_appointment_type_id",
            "ix_waitlist_entries_customer_id",
        ]:
            if idx in indexes:
                op.drop_index(idx, table_name="waitlist_entries")
        op.drop_table("waitlist_entries")
