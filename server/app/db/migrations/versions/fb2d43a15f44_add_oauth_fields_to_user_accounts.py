"""add_oauth_fields_to_user_accounts

Revision ID: fb2d43a15f44
Revises: e2e8d8b1dbff
Create Date: 2026-01-31 07:45:09.048451

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'fb2d43a15f44'
down_revision: Union[str, None] = 'e2e8d8b1dbff'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ==========================================================================
    # STEP 0: Clean up orphan/null records BEFORE setting NOT NULL constraints
    # Production DB may have legacy data with NULL values
    # ==========================================================================
    op.execute("DELETE FROM user_favorites WHERE user_id IS NULL OR trend_id IS NULL")
    op.execute("DELETE FROM user_scripts WHERE user_id IS NULL")
    op.execute("DELETE FROM chat_messages WHERE user_id IS NULL")
    op.execute("DELETE FROM user_searches WHERE user_id IS NULL")
    op.execute("DELETE FROM trends WHERE user_id IS NULL")
    op.execute("DELETE FROM competitors WHERE user_id IS NULL")

    # Fill NULL values with defaults before setting NOT NULL
    op.execute("UPDATE trends SET stats = '{}'::jsonb WHERE stats IS NULL")
    op.execute("UPDATE trends SET initial_stats = '{}'::jsonb WHERE initial_stats IS NULL")
    op.execute("UPDATE trends SET created_at = NOW() WHERE created_at IS NULL")
    op.execute("UPDATE competitors SET username = 'unknown' WHERE username IS NULL")
    op.execute("UPDATE competitors SET recent_videos = '[]'::jsonb WHERE recent_videos IS NULL")
    op.execute("UPDATE competitors SET top_hashtags = '[]'::jsonb WHERE top_hashtags IS NULL")
    op.execute("UPDATE competitors SET content_categories = '[]'::jsonb WHERE content_categories IS NULL")
    op.execute("UPDATE competitors SET is_active = true WHERE is_active IS NULL")
    op.execute("UPDATE competitors SET tags = '[]'::jsonb WHERE tags IS NULL")
    op.execute("UPDATE competitors SET created_at = NOW() WHERE created_at IS NULL")
    op.execute("UPDATE competitors SET updated_at = NOW() WHERE updated_at IS NULL")
    op.execute("UPDATE profile_data SET username = 'unknown' WHERE username IS NULL")
    op.execute("UPDATE profile_data SET channel_data = '{}'::jsonb WHERE channel_data IS NULL")
    op.execute("UPDATE profile_data SET recent_videos_data = '[]'::jsonb WHERE recent_videos_data IS NULL")
    op.execute("UPDATE profile_data SET updated_at = NOW() WHERE updated_at IS NULL")
    op.execute("UPDATE chat_messages SET created_at = NOW() WHERE created_at IS NULL")
    op.execute("UPDATE user_favorites SET tags = '[]'::jsonb WHERE tags IS NULL")
    op.execute("UPDATE user_favorites SET created_at = NOW() WHERE created_at IS NULL")
    op.execute("UPDATE user_scripts SET tone = 'neutral' WHERE tone IS NULL")
    op.execute("UPDATE user_scripts SET language = 'en' WHERE language IS NULL")
    op.execute("UPDATE user_scripts SET tags = '[]'::jsonb WHERE tags IS NULL")
    op.execute("UPDATE user_scripts SET created_at = NOW() WHERE created_at IS NULL")
    op.execute("UPDATE user_scripts SET updated_at = NOW() WHERE updated_at IS NULL")
    op.execute("UPDATE user_searches SET filters = '{}'::jsonb WHERE filters IS NULL")
    op.execute("UPDATE user_searches SET results_count = 0 WHERE results_count IS NULL")
    op.execute("UPDATE user_searches SET created_at = NOW() WHERE created_at IS NULL")
    op.execute("UPDATE user_settings SET dark_mode = false WHERE dark_mode IS NULL")
    op.execute("UPDATE user_settings SET language = 'en' WHERE language IS NULL")
    op.execute("UPDATE user_settings SET region = 'US' WHERE region IS NULL")
    op.execute("UPDATE user_settings SET timezone = 'UTC' WHERE timezone IS NULL")
    op.execute("UPDATE user_settings SET auto_generate_scripts = true WHERE auto_generate_scripts IS NULL")
    op.execute("UPDATE user_settings SET notifications_email = true WHERE notifications_email IS NULL")
    op.execute("UPDATE user_settings SET notifications_trends = true WHERE notifications_trends IS NULL")
    op.execute("UPDATE user_settings SET notifications_competitors = true WHERE notifications_competitors IS NULL")
    op.execute("UPDATE user_settings SET notifications_new_videos = true WHERE notifications_new_videos IS NULL")
    op.execute("UPDATE user_settings SET notifications_weekly_report = true WHERE notifications_weekly_report IS NULL")
    op.execute("UPDATE user_settings SET created_at = NOW() WHERE created_at IS NULL")
    op.execute("UPDATE user_settings SET updated_at = NOW() WHERE updated_at IS NULL")
    op.execute("UPDATE users SET is_active = true WHERE is_active IS NULL")
    op.execute("UPDATE users SET is_verified = false WHERE is_verified IS NULL")
    op.execute("UPDATE users SET is_admin = false WHERE is_admin IS NULL")
    op.execute("UPDATE users SET credits = 100 WHERE credits IS NULL")
    op.execute("UPDATE users SET created_at = NOW() WHERE created_at IS NULL")
    op.execute("UPDATE users SET updated_at = NOW() WHERE updated_at IS NULL")

    # ==========================================================================
    # STEP 1: chat_messages - add new columns
    # ==========================================================================
    op.add_column('chat_messages', sa.Column('session_id', sa.String(length=100), nullable=False, server_default='legacy'))
    op.add_column('chat_messages', sa.Column('tokens_used', sa.Integer(), nullable=True))
    op.alter_column('chat_messages', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=False)
    op.create_index(op.f('ix_chat_messages_session_id'), 'chat_messages', ['session_id'], unique=False)
    op.create_index('ix_chat_session_created', 'chat_messages', ['session_id', 'created_at'], unique=False)
    op.create_index('ix_chat_user_session', 'chat_messages', ['user_id', 'session_id'], unique=False)

    # ==========================================================================
    # STEP 2: competitors - set NOT NULL + indexes
    # ==========================================================================
    op.alter_column('competitors', 'user_id',
               existing_type=sa.INTEGER(),
               nullable=False)
    op.alter_column('competitors', 'username',
               existing_type=sa.VARCHAR(),
               nullable=False)
    op.alter_column('competitors', 'recent_videos',
               existing_type=postgresql.JSONB(astext_type=sa.Text()),
               nullable=False)
    op.alter_column('competitors', 'top_hashtags',
               existing_type=postgresql.JSONB(astext_type=sa.Text()),
               nullable=False)
    op.alter_column('competitors', 'content_categories',
               existing_type=postgresql.JSONB(astext_type=sa.Text()),
               nullable=False)
    op.alter_column('competitors', 'is_active',
               existing_type=sa.BOOLEAN(),
               nullable=False)
    op.alter_column('competitors', 'tags',
               existing_type=postgresql.JSONB(astext_type=sa.Text()),
               nullable=False,
               existing_server_default=sa.text("'[]'::jsonb"))
    op.alter_column('competitors', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=False)
    op.alter_column('competitors', 'updated_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=False)
    op.drop_index(op.f('ix_competitors_username'), table_name='competitors')
    op.create_index(op.f('ix_competitors_username'), 'competitors', ['username'], unique=False)
    op.create_index('ix_competitors_user_active', 'competitors', ['user_id', 'is_active'], unique=False)
    op.create_index(op.f('ix_competitors_user_id'), 'competitors', ['user_id'], unique=False)
    op.create_unique_constraint('uix_competitor_user_username', 'competitors', ['user_id', 'username'])
    op.create_foreign_key(None, 'competitors', 'users', ['user_id'], ['id'], ondelete='CASCADE')

    # ==========================================================================
    # STEP 3: profile_data
    # ==========================================================================
    op.alter_column('profile_data', 'username',
               existing_type=sa.VARCHAR(),
               nullable=False)
    op.alter_column('profile_data', 'channel_data',
               existing_type=postgresql.JSONB(astext_type=sa.Text()),
               nullable=False)
    op.alter_column('profile_data', 'recent_videos_data',
               existing_type=postgresql.JSONB(astext_type=sa.Text()),
               nullable=False)
    op.alter_column('profile_data', 'updated_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=False)

    # ==========================================================================
    # STEP 4: trends
    # ==========================================================================
    op.alter_column('trends', 'user_id',
               existing_type=sa.INTEGER(),
               nullable=False)
    op.alter_column('trends', 'stats',
               existing_type=postgresql.JSONB(astext_type=sa.Text()),
               nullable=False)
    op.alter_column('trends', 'initial_stats',
               existing_type=postgresql.JSONB(astext_type=sa.Text()),
               nullable=False)
    # Create enum type first, then cast with USING
    op.execute("DO $$ BEGIN CREATE TYPE searchmode AS ENUM ('KEYWORDS', 'USERNAME'); EXCEPTION WHEN duplicate_object THEN null; END $$;")
    op.execute("ALTER TABLE trends ALTER COLUMN search_mode TYPE searchmode USING search_mode::searchmode")
    op.alter_column('trends', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=False)
    op.drop_index(op.f('ix_trends_url'), table_name='trends')
    op.create_index(op.f('ix_trends_url'), 'trends', ['url'], unique=False)
    op.create_index('ix_trends_user_created', 'trends', ['user_id', 'created_at'], unique=False)
    op.create_index(op.f('ix_trends_user_id'), 'trends', ['user_id'], unique=False)
    op.create_index('ix_trends_user_score', 'trends', ['user_id', 'uts_score'], unique=False)
    op.create_index('ix_trends_user_vertical', 'trends', ['user_id', 'vertical'], unique=False)
    op.create_index(op.f('ix_trends_uts_score'), 'trends', ['uts_score'], unique=False)
    op.create_unique_constraint('uix_trend_user_platform', 'trends', ['user_id', 'platform_id'])
    op.create_foreign_key(None, 'trends', 'users', ['user_id'], ['id'], ondelete='CASCADE')

    # ==========================================================================
    # STEP 5: user_favorites
    # ==========================================================================
    op.alter_column('user_favorites', 'tags',
               existing_type=postgresql.JSONB(astext_type=sa.Text()),
               nullable=False,
               existing_server_default=sa.text("'[]'::jsonb"))
    op.alter_column('user_favorites', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=False)
    op.create_unique_constraint('uix_favorite_user_trend', 'user_favorites', ['user_id', 'trend_id'])

    # ==========================================================================
    # STEP 6: user_scripts - add new columns with server_default
    # ==========================================================================
    op.add_column('user_scripts', sa.Column('hook', sa.Text(), nullable=False, server_default=''))
    op.add_column('user_scripts', sa.Column('body', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'))
    op.add_column('user_scripts', sa.Column('call_to_action', sa.Text(), nullable=True))
    op.add_column('user_scripts', sa.Column('source_trend_id', sa.Integer(), nullable=True))
    op.add_column('user_scripts', sa.Column('niche', sa.String(length=100), nullable=True))
    op.add_column('user_scripts', sa.Column('duration_seconds', sa.Integer(), nullable=False, server_default='30'))
    op.add_column('user_scripts', sa.Column('model_used', sa.String(length=50), nullable=False, server_default='gemini'))
    op.add_column('user_scripts', sa.Column('viral_elements', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'))
    op.add_column('user_scripts', sa.Column('tips', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'))
    op.add_column('user_scripts', sa.Column('is_favorite', sa.Boolean(), nullable=False, server_default='false'))
    op.alter_column('user_scripts', 'tone',
               existing_type=sa.VARCHAR(),
               nullable=False)
    op.alter_column('user_scripts', 'language',
               existing_type=sa.VARCHAR(),
               nullable=False)
    op.alter_column('user_scripts', 'tags',
               existing_type=postgresql.JSONB(astext_type=sa.Text()),
               nullable=False)
    op.alter_column('user_scripts', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=False)
    op.alter_column('user_scripts', 'updated_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=False)
    op.create_index('ix_scripts_user_created', 'user_scripts', ['user_id', 'created_at'], unique=False)
    op.create_index('ix_scripts_user_favorite', 'user_scripts', ['user_id', 'is_favorite'], unique=False)
    op.drop_constraint(op.f('user_scripts_trend_id_fkey'), 'user_scripts', type_='foreignkey')
    op.create_foreign_key(None, 'user_scripts', 'trends', ['source_trend_id'], ['id'], ondelete='SET NULL')
    op.drop_column('user_scripts', 'content')
    op.drop_column('user_scripts', 'trend_id')

    # ==========================================================================
    # STEP 7: user_searches - add new columns with server_default
    # ==========================================================================
    op.execute("ALTER TABLE user_searches ADD COLUMN IF NOT EXISTS mode searchmode NOT NULL DEFAULT 'KEYWORDS'")
    op.add_column('user_searches', sa.Column('is_deep', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('user_searches', sa.Column('execution_time_ms', sa.Integer(), nullable=True))
    op.alter_column('user_searches', 'filters',
               existing_type=postgresql.JSONB(astext_type=sa.Text()),
               nullable=False)
    op.alter_column('user_searches', 'results_count',
               existing_type=sa.INTEGER(),
               nullable=False)
    op.alter_column('user_searches', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=False)
    op.create_index('ix_searches_user_created', 'user_searches', ['user_id', 'created_at'], unique=False)
    op.create_index(op.f('ix_user_searches_query'), 'user_searches', ['query'], unique=False)

    # ==========================================================================
    # STEP 8: user_settings
    # ==========================================================================
    op.alter_column('user_settings', 'dark_mode',
               existing_type=sa.BOOLEAN(),
               nullable=False)
    op.alter_column('user_settings', 'language',
               existing_type=sa.VARCHAR(),
               nullable=False)
    op.alter_column('user_settings', 'region',
               existing_type=sa.VARCHAR(),
               nullable=False)
    op.alter_column('user_settings', 'timezone',
               existing_type=sa.VARCHAR(length=50),
               nullable=False,
               existing_server_default=sa.text("'UTC'::character varying"))
    op.alter_column('user_settings', 'auto_generate_scripts',
               existing_type=sa.BOOLEAN(),
               nullable=False)
    op.execute("ALTER TABLE user_settings ALTER COLUMN default_search_mode TYPE searchmode USING default_search_mode::searchmode")
    op.alter_column('user_settings', 'default_search_mode',
               nullable=False)
    op.alter_column('user_settings', 'notifications_email',
               existing_type=sa.BOOLEAN(),
               nullable=False,
               existing_server_default=sa.text('true'))
    op.alter_column('user_settings', 'notifications_trends',
               existing_type=sa.BOOLEAN(),
               nullable=False)
    op.alter_column('user_settings', 'notifications_competitors',
               existing_type=sa.BOOLEAN(),
               nullable=False)
    op.alter_column('user_settings', 'notifications_new_videos',
               existing_type=sa.BOOLEAN(),
               nullable=False)
    op.alter_column('user_settings', 'notifications_weekly_report',
               existing_type=sa.BOOLEAN(),
               nullable=False)
    op.alter_column('user_settings', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=False)
    op.alter_column('user_settings', 'updated_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=False)
    op.drop_constraint(op.f('user_settings_user_id_key'), 'user_settings', type_='unique')
    op.create_index(op.f('ix_user_settings_user_id'), 'user_settings', ['user_id'], unique=True)

    # ==========================================================================
    # STEP 9: users
    # ==========================================================================
    op.alter_column('users', 'hashed_password',
               existing_type=sa.VARCHAR(),
               nullable=True)
    op.execute("DO $$ BEGIN CREATE TYPE subscriptiontier AS ENUM ('FREE', 'CREATOR', 'PRO', 'AGENCY'); EXCEPTION WHEN duplicate_object THEN null; END $$;")
    op.execute("ALTER TABLE users ALTER COLUMN subscription_tier TYPE subscriptiontier USING subscription_tier::subscriptiontier")
    op.alter_column('users', 'subscription_tier',
               nullable=False)
    op.alter_column('users', 'credits',
               existing_type=sa.INTEGER(),
               nullable=False,
               existing_server_default=sa.text('100'))
    op.alter_column('users', 'is_active',
               existing_type=sa.BOOLEAN(),
               nullable=False)
    op.alter_column('users', 'is_verified',
               existing_type=sa.BOOLEAN(),
               nullable=False)
    op.alter_column('users', 'is_admin',
               existing_type=sa.BOOLEAN(),
               nullable=False,
               existing_server_default=sa.text('false'))
    op.alter_column('users', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=False)
    op.alter_column('users', 'updated_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=False)
    op.create_index('ix_users_oauth', 'users', ['oauth_provider', 'oauth_id'], unique=False)
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index('ix_users_oauth', table_name='users')
    op.alter_column('users', 'updated_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=True)
    op.alter_column('users', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=True)
    op.alter_column('users', 'is_admin',
               existing_type=sa.BOOLEAN(),
               nullable=True,
               existing_server_default=sa.text('false'))
    op.alter_column('users', 'is_verified',
               existing_type=sa.BOOLEAN(),
               nullable=True)
    op.alter_column('users', 'is_active',
               existing_type=sa.BOOLEAN(),
               nullable=True)
    op.alter_column('users', 'credits',
               existing_type=sa.INTEGER(),
               nullable=True,
               existing_server_default=sa.text('100'))
    op.alter_column('users', 'subscription_tier',
               existing_type=sa.Enum('FREE', 'CREATOR', 'PRO', 'AGENCY', name='subscriptiontier'),
               type_=sa.VARCHAR(length=20),
               nullable=True,
               existing_server_default=sa.text("'FREE'::character varying"))
    op.alter_column('users', 'hashed_password',
               existing_type=sa.VARCHAR(),
               nullable=False)
    op.drop_index(op.f('ix_user_settings_user_id'), table_name='user_settings')
    op.create_unique_constraint(op.f('user_settings_user_id_key'), 'user_settings', ['user_id'], postgresql_nulls_not_distinct=False)
    op.alter_column('user_settings', 'updated_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=True)
    op.alter_column('user_settings', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=True)
    op.alter_column('user_settings', 'notifications_weekly_report',
               existing_type=sa.BOOLEAN(),
               nullable=True)
    op.alter_column('user_settings', 'notifications_new_videos',
               existing_type=sa.BOOLEAN(),
               nullable=True)
    op.alter_column('user_settings', 'notifications_competitors',
               existing_type=sa.BOOLEAN(),
               nullable=True)
    op.alter_column('user_settings', 'notifications_trends',
               existing_type=sa.BOOLEAN(),
               nullable=True)
    op.alter_column('user_settings', 'notifications_email',
               existing_type=sa.BOOLEAN(),
               nullable=True,
               existing_server_default=sa.text('true'))
    op.alter_column('user_settings', 'default_search_mode',
               existing_type=sa.Enum('KEYWORDS', 'USERNAME', name='searchmode'),
               type_=sa.VARCHAR(length=20),
               nullable=True,
               existing_server_default=sa.text("'KEYWORDS'::character varying"))
    op.alter_column('user_settings', 'auto_generate_scripts',
               existing_type=sa.BOOLEAN(),
               nullable=True)
    op.alter_column('user_settings', 'timezone',
               existing_type=sa.VARCHAR(length=50),
               nullable=True,
               existing_server_default=sa.text("'UTC'::character varying"))
    op.alter_column('user_settings', 'region',
               existing_type=sa.VARCHAR(),
               nullable=True)
    op.alter_column('user_settings', 'language',
               existing_type=sa.VARCHAR(),
               nullable=True)
    op.alter_column('user_settings', 'dark_mode',
               existing_type=sa.BOOLEAN(),
               nullable=True)
    op.drop_index(op.f('ix_user_searches_query'), table_name='user_searches')
    op.drop_index('ix_searches_user_created', table_name='user_searches')
    op.alter_column('user_searches', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=True)
    op.alter_column('user_searches', 'results_count',
               existing_type=sa.INTEGER(),
               nullable=True)
    op.alter_column('user_searches', 'filters',
               existing_type=postgresql.JSONB(astext_type=sa.Text()),
               nullable=True)
    op.drop_column('user_searches', 'execution_time_ms')
    op.drop_column('user_searches', 'is_deep')
    op.drop_column('user_searches', 'mode')
    op.add_column('user_scripts', sa.Column('trend_id', sa.INTEGER(), autoincrement=False, nullable=True))
    op.add_column('user_scripts', sa.Column('content', sa.TEXT(), autoincrement=False, nullable=False))
    op.drop_constraint(None, 'user_scripts', type_='foreignkey')
    op.create_foreign_key(op.f('user_scripts_trend_id_fkey'), 'user_scripts', 'trends', ['trend_id'], ['id'], ondelete='SET NULL')
    op.drop_index('ix_scripts_user_favorite', table_name='user_scripts')
    op.drop_index('ix_scripts_user_created', table_name='user_scripts')
    op.alter_column('user_scripts', 'updated_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=True)
    op.alter_column('user_scripts', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=True)
    op.alter_column('user_scripts', 'tags',
               existing_type=postgresql.JSONB(astext_type=sa.Text()),
               nullable=True)
    op.alter_column('user_scripts', 'language',
               existing_type=sa.VARCHAR(),
               nullable=True)
    op.alter_column('user_scripts', 'tone',
               existing_type=sa.VARCHAR(),
               nullable=True)
    op.drop_column('user_scripts', 'is_favorite')
    op.drop_column('user_scripts', 'tips')
    op.drop_column('user_scripts', 'viral_elements')
    op.drop_column('user_scripts', 'model_used')
    op.drop_column('user_scripts', 'duration_seconds')
    op.drop_column('user_scripts', 'niche')
    op.drop_column('user_scripts', 'source_trend_id')
    op.drop_column('user_scripts', 'call_to_action')
    op.drop_column('user_scripts', 'body')
    op.drop_column('user_scripts', 'hook')
    op.drop_constraint('uix_favorite_user_trend', 'user_favorites', type_='unique')
    op.alter_column('user_favorites', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=True)
    op.alter_column('user_favorites', 'tags',
               existing_type=postgresql.JSONB(astext_type=sa.Text()),
               nullable=True,
               existing_server_default=sa.text("'[]'::jsonb"))
    op.drop_constraint(None, 'trends', type_='foreignkey')
    op.drop_constraint('uix_trend_user_platform', 'trends', type_='unique')
    op.drop_index(op.f('ix_trends_uts_score'), table_name='trends')
    op.drop_index('ix_trends_user_vertical', table_name='trends')
    op.drop_index('ix_trends_user_score', table_name='trends')
    op.drop_index(op.f('ix_trends_user_id'), table_name='trends')
    op.drop_index('ix_trends_user_created', table_name='trends')
    op.drop_index(op.f('ix_trends_url'), table_name='trends')
    op.create_index(op.f('ix_trends_url'), 'trends', ['url'], unique=True)
    op.alter_column('trends', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=True)
    op.alter_column('trends', 'search_mode',
               existing_type=sa.Enum('KEYWORDS', 'USERNAME', name='searchmode'),
               type_=sa.VARCHAR(length=20),
               existing_nullable=True)
    op.alter_column('trends', 'initial_stats',
               existing_type=postgresql.JSONB(astext_type=sa.Text()),
               nullable=True)
    op.alter_column('trends', 'stats',
               existing_type=postgresql.JSONB(astext_type=sa.Text()),
               nullable=True)
    op.alter_column('trends', 'user_id',
               existing_type=sa.INTEGER(),
               nullable=True)
    op.alter_column('profile_data', 'updated_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=True)
    op.alter_column('profile_data', 'recent_videos_data',
               existing_type=postgresql.JSONB(astext_type=sa.Text()),
               nullable=True)
    op.alter_column('profile_data', 'channel_data',
               existing_type=postgresql.JSONB(astext_type=sa.Text()),
               nullable=True)
    op.alter_column('profile_data', 'username',
               existing_type=sa.VARCHAR(),
               nullable=True)
    op.drop_constraint(None, 'competitors', type_='foreignkey')
    op.drop_constraint('uix_competitor_user_username', 'competitors', type_='unique')
    op.drop_index(op.f('ix_competitors_user_id'), table_name='competitors')
    op.drop_index('ix_competitors_user_active', table_name='competitors')
    op.drop_index(op.f('ix_competitors_username'), table_name='competitors')
    op.create_index(op.f('ix_competitors_username'), 'competitors', ['username'], unique=True)
    op.alter_column('competitors', 'updated_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=True)
    op.alter_column('competitors', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=True)
    op.alter_column('competitors', 'tags',
               existing_type=postgresql.JSONB(astext_type=sa.Text()),
               nullable=True,
               existing_server_default=sa.text("'[]'::jsonb"))
    op.alter_column('competitors', 'is_active',
               existing_type=sa.BOOLEAN(),
               nullable=True)
    op.alter_column('competitors', 'content_categories',
               existing_type=postgresql.JSONB(astext_type=sa.Text()),
               nullable=True)
    op.alter_column('competitors', 'top_hashtags',
               existing_type=postgresql.JSONB(astext_type=sa.Text()),
               nullable=True)
    op.alter_column('competitors', 'recent_videos',
               existing_type=postgresql.JSONB(astext_type=sa.Text()),
               nullable=True)
    op.alter_column('competitors', 'username',
               existing_type=sa.VARCHAR(),
               nullable=True)
    op.alter_column('competitors', 'user_id',
               existing_type=sa.INTEGER(),
               nullable=True)
    op.drop_index('ix_chat_user_session', table_name='chat_messages')
    op.drop_index('ix_chat_session_created', table_name='chat_messages')
    op.drop_index(op.f('ix_chat_messages_session_id'), table_name='chat_messages')
    op.alter_column('chat_messages', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=True)
    op.drop_column('chat_messages', 'tokens_used')
    op.drop_column('chat_messages', 'session_id')
    # ### end Alembic commands ###
