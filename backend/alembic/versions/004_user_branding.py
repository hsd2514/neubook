"""add organiser branding fields

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
    op.add_column("users", sa.Column("brand_display_name", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("brand_logo_url", sa.String(length=512), nullable=True))
    op.add_column(
        "users",
        sa.Column("brand_primary_color", sa.String(length=7), nullable=False, server_default="#714b67"),
    )
    op.add_column(
        "users",
        sa.Column("brand_accent_color", sa.String(length=7), nullable=False, server_default="#006a68"),
    )
    op.add_column(
        "users",
        sa.Column("brand_theme", sa.String(length=16), nullable=False, server_default="light"),
    )
    op.add_column("users", sa.Column("brand_booking_domain", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "brand_booking_domain")
    op.drop_column("users", "brand_theme")
    op.drop_column("users", "brand_accent_color")
    op.drop_column("users", "brand_primary_color")
    op.drop_column("users", "brand_logo_url")
    op.drop_column("users", "brand_display_name")
