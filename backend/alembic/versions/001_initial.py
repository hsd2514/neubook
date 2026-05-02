"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-05-02

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=False)

    op.create_table(
        "appointment_types",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organiser_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("appointment_kind", sa.String(length=32), nullable=False),
        sa.Column("slot_schedule", sa.String(length=32), nullable=False),
        sa.Column("is_published", sa.Boolean(), nullable=False),
        sa.Column("manage_capacity", sa.Boolean(), nullable=False),
        sa.Column("advance_payment", sa.Boolean(), nullable=False),
        sa.Column("manual_confirmation", sa.Boolean(), nullable=False),
        sa.Column("assignment_mode", sa.String(length=32), nullable=False),
        sa.Column("max_bookings_per_slot", sa.Integer(), nullable=False),
        sa.Column("share_link", sa.String(length=64), nullable=True),
        sa.ForeignKeyConstraint(["organiser_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("share_link"),
    )
    op.create_index(op.f("ix_appointment_types_organiser_id"), "appointment_types", ["organiser_id"], unique=False)
    op.create_index(op.f("ix_appointment_types_share_link"), "appointment_types", ["share_link"], unique=False)

    op.create_table(
        "resources",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("appointment_type_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("working_hours", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(["appointment_type_id"], ["appointment_types.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_resources_appointment_type_id"), "resources", ["appointment_type_id"], unique=False)

    op.create_table(
        "schedules",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("appointment_type_id", sa.Integer(), nullable=False),
        sa.Column("resource_id", sa.Integer(), nullable=True),
        sa.Column("day_of_week", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.ForeignKeyConstraint(["appointment_type_id"], ["appointment_types.id"]),
        sa.ForeignKeyConstraint(["resource_id"], ["resources.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_schedules_appointment_type_id"), "schedules", ["appointment_type_id"], unique=False)
    op.create_index(op.f("ix_schedules_resource_id"), "schedules", ["resource_id"], unique=False)

    op.create_table(
        "questions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("appointment_type_id", sa.Integer(), nullable=False),
        sa.Column("label", sa.String(length=500), nullable=False),
        sa.Column("field_type", sa.String(length=32), nullable=False),
        sa.Column("is_required", sa.Boolean(), nullable=False),
        sa.Column("options", sa.JSON(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["appointment_type_id"], ["appointment_types.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_questions_appointment_type_id"), "questions", ["appointment_type_id"], unique=False)

    op.create_table(
        "bookings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("customer_id", sa.Integer(), nullable=False),
        sa.Column("appointment_type_id", sa.Integer(), nullable=False),
        sa.Column("resource_id", sa.Integer(), nullable=True),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("answers", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["appointment_type_id"], ["appointment_types.id"]),
        sa.ForeignKeyConstraint(["customer_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["resource_id"], ["resources.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_bookings_appointment_type_id"), "bookings", ["appointment_type_id"], unique=False)
    op.create_index(op.f("ix_bookings_customer_id"), "bookings", ["customer_id"], unique=False)
    op.create_index(op.f("ix_bookings_resource_id"), "bookings", ["resource_id"], unique=False)
    op.create_index(op.f("ix_bookings_start_time"), "bookings", ["start_time"], unique=False)

    op.create_table(
        "email_otps",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("code", sa.String(length=10), nullable=False),
        sa.Column("purpose", sa.String(length=32), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_email_otps_email"), "email_otps", ["email"], unique=False)

    op.create_table(
        "password_reset_tokens",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token", sa.String(length=128), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token"),
    )
    op.create_index(
        op.f("ix_password_reset_tokens_token"), "password_reset_tokens", ["token"], unique=False
    )
    op.create_index(
        op.f("ix_password_reset_tokens_user_id"), "password_reset_tokens", ["user_id"], unique=False
    )


def downgrade() -> None:
    op.drop_table("password_reset_tokens")
    op.drop_table("email_otps")
    op.drop_table("bookings")
    op.drop_table("questions")
    op.drop_table("schedules")
    op.drop_table("resources")
    op.drop_table("appointment_types")
    op.drop_table("users")
