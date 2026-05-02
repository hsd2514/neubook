"""add organiser branding fields

Revision ID: 007
Revises: 006
Create Date: 2026-05-02
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = {col["name"] for col in inspector.get_columns("users")}

    if "brand_display_name" not in existing:
        op.add_column("users", sa.Column("brand_display_name", sa.String(length=255), nullable=True))
    if "brand_logo_url" not in existing:
        op.add_column("users", sa.Column("brand_logo_url", sa.String(length=512), nullable=True))
    if "brand_primary_color" not in existing:
        op.add_column(
            "users",
            sa.Column("brand_primary_color", sa.String(length=7), nullable=False, server_default="#714b67"),
        )
    if "brand_accent_color" not in existing:
        op.add_column(
            "users",
            sa.Column("brand_accent_color", sa.String(length=7), nullable=False, server_default="#006a68"),
        )
    if "brand_theme" not in existing:
        op.add_column(
            "users",
            sa.Column("brand_theme", sa.String(length=16), nullable=False, server_default="light"),
        )
    if "brand_booking_domain" not in existing:
        op.add_column("users", sa.Column("brand_booking_domain", sa.String(length=255), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = {col["name"] for col in inspector.get_columns("users")}

    if "brand_booking_domain" in existing:
        op.drop_column("users", "brand_booking_domain")
    if "brand_theme" in existing:
        op.drop_column("users", "brand_theme")
    if "brand_accent_color" in existing:
        op.drop_column("users", "brand_accent_color")
    if "brand_primary_color" in existing:
        op.drop_column("users", "brand_primary_color")
    if "brand_logo_url" in existing:
        op.drop_column("users", "brand_logo_url")
    if "brand_display_name" in existing:
        op.drop_column("users", "brand_display_name")
