"""add platform field to competitors

Revision ID: add_platform_field
Revises: 6225f6e36342
Create Date: 2026-02-07 19:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_platform_field'
down_revision = '6225f6e36342'
branch_labels = None
depends_on = None


def upgrade():
    # Add platform column with default 'tiktok' for existing records
    op.add_column('competitors', sa.Column('platform', sa.String(20), nullable=False, server_default='tiktok'))

    # Remove server_default after adding (best practice)
    op.alter_column('competitors', 'platform', server_default=None)


def downgrade():
    op.drop_column('competitors', 'platform')
