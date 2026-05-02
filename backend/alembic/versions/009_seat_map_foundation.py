"""add seat map foundation tables and booking mode

Revision ID: 009
Revises: 008
Create Date: 2026-05-03
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    appointment_cols = {col["name"] for col in inspector.get_columns("appointment_types")}
    if "booking_mode" not in appointment_cols:
        op.add_column(
            "appointment_types",
            sa.Column("booking_mode", sa.String(length=32), nullable=False, server_default="capacity"),
        )
        op.alter_column("appointment_types", "booking_mode", server_default=None)

    tables = set(inspector.get_table_names())
    if "seat_blocks" not in tables:
        op.create_table(
            "seat_blocks",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("appointment_type_id", sa.Integer(), sa.ForeignKey("appointment_types.id"), nullable=False),
            sa.Column("resource_id", sa.Integer(), sa.ForeignKey("resources.id"), nullable=True),
            sa.Column("name", sa.String(length=128), nullable=False),
            sa.Column("seat_class", sa.String(length=64), nullable=False, server_default="standard"),
            sa.Column("color", sa.String(length=16), nullable=True),
            sa.Column("price_override_paisa", sa.Integer(), nullable=True),
            sa.Column("x", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("y", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("width", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("height", sa.Integer(), nullable=False, server_default="1"),
        )
        op.create_index("ix_seat_blocks_appointment_type_id", "seat_blocks", ["appointment_type_id"])
        op.create_index("ix_seat_blocks_resource_id", "seat_blocks", ["resource_id"])

    tables = set(inspector.get_table_names())
    if "seats" not in tables:
        op.create_table(
            "seats",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("appointment_type_id", sa.Integer(), sa.ForeignKey("appointment_types.id"), nullable=False),
            sa.Column("block_id", sa.Integer(), sa.ForeignKey("seat_blocks.id"), nullable=False),
            sa.Column("resource_id", sa.Integer(), sa.ForeignKey("resources.id"), nullable=True),
            sa.Column("label", sa.String(length=64), nullable=False),
            sa.Column("row_label", sa.String(length=16), nullable=True),
            sa.Column("col_number", sa.Integer(), nullable=True),
            sa.Column("seat_type", sa.String(length=32), nullable=False, server_default="normal"),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
            sa.Column("x", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("y", sa.Integer(), nullable=False, server_default="0"),
        )
        op.create_index("ix_seats_appointment_type_id", "seats", ["appointment_type_id"])
        op.create_index("ix_seats_block_id", "seats", ["block_id"])
        op.create_index("ix_seats_resource_id", "seats", ["resource_id"])

    tables = set(inspector.get_table_names())
    if "booking_seats" not in tables:
        op.create_table(
            "booking_seats",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("booking_id", sa.Integer(), sa.ForeignKey("bookings.id"), nullable=False),
            sa.Column("seat_id", sa.Integer(), sa.ForeignKey("seats.id"), nullable=False),
            sa.UniqueConstraint("booking_id", "seat_id", name="uq_booking_seat"),
        )
        op.create_index("ix_booking_seats_booking_id", "booking_seats", ["booking_id"])
        op.create_index("ix_booking_seats_seat_id", "booking_seats", ["seat_id"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if "booking_seats" in tables:
        op.drop_index("ix_booking_seats_seat_id", table_name="booking_seats")
        op.drop_index("ix_booking_seats_booking_id", table_name="booking_seats")
        op.drop_table("booking_seats")
    if "seats" in tables:
        op.drop_index("ix_seats_resource_id", table_name="seats")
        op.drop_index("ix_seats_block_id", table_name="seats")
        op.drop_index("ix_seats_appointment_type_id", table_name="seats")
        op.drop_table("seats")
    if "seat_blocks" in tables:
        op.drop_index("ix_seat_blocks_resource_id", table_name="seat_blocks")
        op.drop_index("ix_seat_blocks_appointment_type_id", table_name="seat_blocks")
        op.drop_table("seat_blocks")

    appointment_cols = {col["name"] for col in inspector.get_columns("appointment_types")}
    if "booking_mode" in appointment_cols:
        op.drop_column("appointment_types", "booking_mode")
