"""increase avatar_url length for instagram urls

Revision ID: increase_avatar_url
Revises: add_platform_field
Create Date: 2026-02-07 19:50:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'increase_avatar_url'
down_revision = 'add_platform_field'
branch_labels = None
depends_on = None


def upgrade():
    # Increase avatar_url from 500 to 1000 characters for Instagram URLs
    op.alter_column('competitors', 'avatar_url',
                    type_=sa.String(1000),
                    existing_type=sa.String(500))


def downgrade():
    op.alter_column('competitors', 'avatar_url',
                    type_=sa.String(500),
                    existing_type=sa.String(1000))
