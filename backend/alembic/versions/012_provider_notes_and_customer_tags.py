"""provider_notes_and_customer_tags

Revision ID: 012
Revises: 011_waitlist
Create Date: 2026-05-03 03:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '012'
down_revision: Union[str, None] = '011'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'provider_notes',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('provider_id', sa.Integer(), nullable=False),
        sa.Column('customer_id', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['provider_id'], ['users.id']),
        sa.ForeignKeyConstraint(['customer_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_provider_notes_provider_id', 'provider_notes', ['provider_id'])
    op.create_index('ix_provider_notes_customer_id', 'provider_notes', ['customer_id'])

    op.create_table(
        'customer_tags',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('provider_id', sa.Integer(), nullable=False),
        sa.Column('customer_id', sa.Integer(), nullable=False),
        sa.Column('label', sa.String(length=64), nullable=False),
        sa.Column('color', sa.String(length=7), nullable=False, server_default='#e5e7eb'),
        sa.Column('is_system_suggested', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['provider_id'], ['users.id']),
        sa.ForeignKeyConstraint(['customer_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_customer_tags_provider_id', 'customer_tags', ['provider_id'])
    op.create_index('ix_customer_tags_customer_id', 'customer_tags', ['customer_id'])


def downgrade() -> None:
    op.drop_index('ix_customer_tags_customer_id', table_name='customer_tags')
    op.drop_index('ix_customer_tags_provider_id', table_name='customer_tags')
    op.drop_table('customer_tags')
    op.drop_index('ix_provider_notes_customer_id', table_name='provider_notes')
    op.drop_index('ix_provider_notes_provider_id', table_name='provider_notes')
    op.drop_table('provider_notes')
