"""add_ai_credits_tracking

Revision ID: e8f7a9c2b1d3
Revises: dcaeba9948be
Create Date: 2026-02-04 23:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e8f7a9c2b1d3'
down_revision: Union[str, None] = 'dcaeba9948be'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add AI credits tracking fields to users and user_settings tables.

    Phase 1: Basic credits tracking for Usage page MVP
    - monthly_credits_limit: Plan-based limit (100/500/2000/10000)
    - monthly_credits_used: Credits spent this month
    - bonus_credits: Bonus credits that never expire
    - rollover_credits: Credits rolled over from previous month
    - ai_auto_mode: Toggle for automatic AI model selection
    """
    # Add new fields to users table
    op.add_column('users', sa.Column('monthly_credits_limit', sa.Integer(), nullable=False, server_default='100'))
    op.add_column('users', sa.Column('monthly_credits_used', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('bonus_credits', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('rollover_credits', sa.Integer(), nullable=False, server_default='0'))

    # Add ai_auto_mode to user_settings table
    op.add_column('user_settings', sa.Column('ai_auto_mode', sa.Boolean(), nullable=False, server_default='true'))

    # Update existing users based on their subscription tier
    # Free: 100, Creator: 500, Pro: 2000, Agency: 10000
    op.execute("""
        UPDATE users
        SET monthly_credits_limit = CASE subscription_tier
            WHEN 'FREE' THEN 100
            WHEN 'CREATOR' THEN 500
            WHEN 'PRO' THEN 2000
            WHEN 'AGENCY' THEN 10000
            ELSE 100
        END
    """)

    # Give bonus credits to Creator+ users as a welcome gift
    op.execute("""
        UPDATE users
        SET bonus_credits = CASE subscription_tier
            WHEN 'CREATOR' THEN 150
            WHEN 'PRO' THEN 300
            WHEN 'AGENCY' THEN 500
            ELSE 0
        END
    """)


def downgrade() -> None:
    """Remove AI credits tracking fields."""
    # Remove fields from user_settings
    op.drop_column('user_settings', 'ai_auto_mode')

    # Remove fields from users
    op.drop_column('users', 'rollover_credits')
    op.drop_column('users', 'bonus_credits')
    op.drop_column('users', 'monthly_credits_used')
    op.drop_column('users', 'monthly_credits_limit')
