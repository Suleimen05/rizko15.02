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
    op.execute("UPDATE trends SET search_mode = 'KEYWORDS' WHERE search_mode IS NULL")
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
    op.execute("UPDATE user_settings SET default_search_mode = 'KEYWORDS' WHERE default_search_mode IS NULL")
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
    op.execute("UPDATE users SET subscription_tier = 'FREE' WHERE subscription_tier IS NULL")
    op.execute("UPDATE users SET created_at = NOW() WHERE created_at IS NULL")
    op.execute("UPDATE users SET updated_at = NOW() WHERE updated_at IS NULL")

    # Normalize ENUM values to uppercase before casting
    op.execute("UPDATE trends SET search_mode = UPPER(search_mode) WHERE search_mode IS NOT NULL")
    op.execute("UPDATE user_settings SET default_search_mode = UPPER(default_search_mode) WHERE default_search_mode IS NOT NULL")
    op.execute("UPDATE users SET subscription_tier = UPPER(subscription_tier) WHERE subscription_tier IS NOT NULL")

    # ==========================================================================
    # STEP 1: chat_messages - add new columns (IF NOT EXISTS for safety)
    # ==========================================================================
    op.execute("ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS session_id VARCHAR(100) NOT NULL DEFAULT 'legacy'")
    op.execute("ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS tokens_used INTEGER")
    op.alter_column('chat_messages', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=False)
    op.execute("CREATE INDEX IF NOT EXISTS ix_chat_messages_session_id ON chat_messages (session_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_chat_session_created ON chat_messages (session_id, created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_chat_user_session ON chat_messages (user_id, session_id)")

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
    op.execute("DROP INDEX IF EXISTS ix_competitors_username")
    op.execute("CREATE INDEX IF NOT EXISTS ix_competitors_username ON competitors (username)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_competitors_user_active ON competitors (user_id, is_active)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_competitors_user_id ON competitors (user_id)")
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE competitors ADD CONSTRAINT uix_competitor_user_username UNIQUE (user_id, username);
        EXCEPTION WHEN duplicate_table THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE competitors ADD CONSTRAINT fk_competitors_user_id
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)

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
    # Create enum type first, then cast with USING (handle DEFAULT safely)
    op.execute("DO $$ BEGIN CREATE TYPE searchmode AS ENUM ('KEYWORDS', 'USERNAME'); EXCEPTION WHEN duplicate_object THEN null; END $$;")
    op.execute("ALTER TABLE trends ALTER COLUMN search_mode DROP DEFAULT")
    op.execute("ALTER TABLE trends ALTER COLUMN search_mode TYPE searchmode USING search_mode::searchmode")
    op.alter_column('trends', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=False)
    op.execute("DROP INDEX IF EXISTS ix_trends_url")
    op.execute("CREATE INDEX IF NOT EXISTS ix_trends_url ON trends (url)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_trends_user_created ON trends (user_id, created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_trends_user_id ON trends (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_trends_user_score ON trends (user_id, uts_score)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_trends_user_vertical ON trends (user_id, vertical)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_trends_uts_score ON trends (uts_score)")
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE trends ADD CONSTRAINT uix_trend_user_platform UNIQUE (user_id, platform_id);
        EXCEPTION WHEN duplicate_table THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE trends ADD CONSTRAINT fk_trends_user_id
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)

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
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE user_favorites ADD CONSTRAINT uix_favorite_user_trend UNIQUE (user_id, trend_id);
        EXCEPTION WHEN duplicate_table THEN NULL;
        END $$;
    """)

    # ==========================================================================
    # STEP 6: user_scripts - add new columns with IF NOT EXISTS
    # ==========================================================================
    op.execute("ALTER TABLE user_scripts ADD COLUMN IF NOT EXISTS hook TEXT NOT NULL DEFAULT ''")
    op.execute("ALTER TABLE user_scripts ADD COLUMN IF NOT EXISTS body JSONB NOT NULL DEFAULT '[]'")
    op.execute("ALTER TABLE user_scripts ADD COLUMN IF NOT EXISTS call_to_action TEXT")
    op.execute("ALTER TABLE user_scripts ADD COLUMN IF NOT EXISTS source_trend_id INTEGER")
    op.execute("ALTER TABLE user_scripts ADD COLUMN IF NOT EXISTS niche VARCHAR(100)")
    op.execute("ALTER TABLE user_scripts ADD COLUMN IF NOT EXISTS duration_seconds INTEGER NOT NULL DEFAULT 30")
    op.execute("ALTER TABLE user_scripts ADD COLUMN IF NOT EXISTS model_used VARCHAR(50) NOT NULL DEFAULT 'gemini'")
    op.execute("ALTER TABLE user_scripts ADD COLUMN IF NOT EXISTS viral_elements JSONB NOT NULL DEFAULT '[]'")
    op.execute("ALTER TABLE user_scripts ADD COLUMN IF NOT EXISTS tips JSONB NOT NULL DEFAULT '[]'")
    op.execute("ALTER TABLE user_scripts ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false")
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
    op.execute("CREATE INDEX IF NOT EXISTS ix_scripts_user_created ON user_scripts (user_id, created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_scripts_user_favorite ON user_scripts (user_id, is_favorite)")
    # Drop old FK and column safely
    op.execute("ALTER TABLE user_scripts DROP CONSTRAINT IF EXISTS user_scripts_trend_id_fkey")
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE user_scripts ADD CONSTRAINT fk_user_scripts_source_trend
                FOREIGN KEY (source_trend_id) REFERENCES trends(id) ON DELETE SET NULL;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("ALTER TABLE user_scripts DROP COLUMN IF EXISTS content")
    op.execute("ALTER TABLE user_scripts DROP COLUMN IF EXISTS trend_id")

    # ==========================================================================
    # STEP 7: user_searches - add new columns with IF NOT EXISTS
    # ==========================================================================
    op.execute("ALTER TABLE user_searches ADD COLUMN IF NOT EXISTS mode searchmode NOT NULL DEFAULT 'KEYWORDS'")
    op.execute("ALTER TABLE user_searches ADD COLUMN IF NOT EXISTS is_deep BOOLEAN NOT NULL DEFAULT false")
    op.execute("ALTER TABLE user_searches ADD COLUMN IF NOT EXISTS execution_time_ms INTEGER")
    op.alter_column('user_searches', 'filters',
               existing_type=postgresql.JSONB(astext_type=sa.Text()),
               nullable=False)
    op.alter_column('user_searches', 'results_count',
               existing_type=sa.INTEGER(),
               nullable=False)
    op.alter_column('user_searches', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=False)
    op.execute("CREATE INDEX IF NOT EXISTS ix_searches_user_created ON user_searches (user_id, created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_user_searches_query ON user_searches (query)")

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
    # default_search_mode: DROP DEFAULT → TYPE change → SET DEFAULT
    op.execute("ALTER TABLE user_settings ALTER COLUMN default_search_mode DROP DEFAULT")
    op.execute("ALTER TABLE user_settings ALTER COLUMN default_search_mode TYPE searchmode USING default_search_mode::searchmode")
    op.execute("ALTER TABLE user_settings ALTER COLUMN default_search_mode SET DEFAULT 'KEYWORDS'")
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
    op.execute("ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_user_id_key")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_user_settings_user_id ON user_settings (user_id)")

    # ==========================================================================
    # STEP 9: users
    # ==========================================================================
    op.alter_column('users', 'hashed_password',
               existing_type=sa.VARCHAR(),
               nullable=True)
    # subscription_tier: DROP DEFAULT → CREATE ENUM → TYPE change → SET DEFAULT
    op.execute("DO $$ BEGIN CREATE TYPE subscriptiontier AS ENUM ('FREE', 'CREATOR', 'PRO', 'AGENCY'); EXCEPTION WHEN duplicate_object THEN null; END $$;")
    op.execute("ALTER TABLE users ALTER COLUMN subscription_tier DROP DEFAULT")
    op.execute("ALTER TABLE users ALTER COLUMN subscription_tier TYPE subscriptiontier USING subscription_tier::subscriptiontier")
    op.execute("ALTER TABLE users ALTER COLUMN subscription_tier SET DEFAULT 'FREE'")
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
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_oauth ON users (oauth_provider, oauth_id)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_users_oauth")
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
    # subscription_tier: ENUM → VARCHAR
    op.execute("ALTER TABLE users ALTER COLUMN subscription_tier DROP DEFAULT")
    op.execute("ALTER TABLE users ALTER COLUMN subscription_tier TYPE VARCHAR(20) USING subscription_tier::text")
    op.execute("ALTER TABLE users ALTER COLUMN subscription_tier SET DEFAULT 'FREE'")
    op.alter_column('users', 'subscription_tier', nullable=True)
    op.alter_column('users', 'hashed_password',
               existing_type=sa.VARCHAR(),
               nullable=False)
    op.execute("DROP INDEX IF EXISTS ix_user_settings_user_id")
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE user_settings ADD CONSTRAINT user_settings_user_id_key UNIQUE (user_id);
        EXCEPTION WHEN duplicate_table THEN NULL;
        END $$;
    """)
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
    # default_search_mode: ENUM → VARCHAR
    op.execute("ALTER TABLE user_settings ALTER COLUMN default_search_mode DROP DEFAULT")
    op.execute("ALTER TABLE user_settings ALTER COLUMN default_search_mode TYPE VARCHAR(20) USING default_search_mode::text")
    op.execute("ALTER TABLE user_settings ALTER COLUMN default_search_mode SET DEFAULT 'KEYWORDS'")
    op.alter_column('user_settings', 'default_search_mode', nullable=True)
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
    op.execute("DROP INDEX IF EXISTS ix_user_searches_query")
    op.execute("DROP INDEX IF EXISTS ix_searches_user_created")
    op.alter_column('user_searches', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=True)
    op.alter_column('user_searches', 'results_count',
               existing_type=sa.INTEGER(),
               nullable=True)
    op.alter_column('user_searches', 'filters',
               existing_type=postgresql.JSONB(astext_type=sa.Text()),
               nullable=True)
    op.execute("ALTER TABLE user_searches DROP COLUMN IF EXISTS execution_time_ms")
    op.execute("ALTER TABLE user_searches DROP COLUMN IF EXISTS is_deep")
    op.execute("ALTER TABLE user_searches DROP COLUMN IF EXISTS mode")
    op.execute("ALTER TABLE user_scripts ADD COLUMN IF NOT EXISTS trend_id INTEGER")
    op.execute("ALTER TABLE user_scripts ADD COLUMN IF NOT EXISTS content TEXT NOT NULL DEFAULT ''")
    op.execute("ALTER TABLE user_scripts DROP CONSTRAINT IF EXISTS fk_user_scripts_source_trend")
    op.execute("""
        DO $$ BEGIN
            ALTER TABLE user_scripts ADD CONSTRAINT user_scripts_trend_id_fkey
                FOREIGN KEY (trend_id) REFERENCES trends(id) ON DELETE SET NULL;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("DROP INDEX IF EXISTS ix_scripts_user_favorite")
    op.execute("DROP INDEX IF EXISTS ix_scripts_user_created")
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
    op.execute("ALTER TABLE user_scripts DROP COLUMN IF EXISTS is_favorite")
    op.execute("ALTER TABLE user_scripts DROP COLUMN IF EXISTS tips")
    op.execute("ALTER TABLE user_scripts DROP COLUMN IF EXISTS viral_elements")
    op.execute("ALTER TABLE user_scripts DROP COLUMN IF EXISTS model_used")
    op.execute("ALTER TABLE user_scripts DROP COLUMN IF EXISTS duration_seconds")
    op.execute("ALTER TABLE user_scripts DROP COLUMN IF EXISTS niche")
    op.execute("ALTER TABLE user_scripts DROP COLUMN IF EXISTS source_trend_id")
    op.execute("ALTER TABLE user_scripts DROP COLUMN IF EXISTS call_to_action")
    op.execute("ALTER TABLE user_scripts DROP COLUMN IF EXISTS body")
    op.execute("ALTER TABLE user_scripts DROP COLUMN IF EXISTS hook")
    op.execute("ALTER TABLE user_favorites DROP CONSTRAINT IF EXISTS uix_favorite_user_trend")
    op.alter_column('user_favorites', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=True)
    op.alter_column('user_favorites', 'tags',
               existing_type=postgresql.JSONB(astext_type=sa.Text()),
               nullable=True,
               existing_server_default=sa.text("'[]'::jsonb"))
    op.execute("ALTER TABLE trends DROP CONSTRAINT IF EXISTS fk_trends_user_id")
    op.execute("ALTER TABLE trends DROP CONSTRAINT IF EXISTS uix_trend_user_platform")
    op.execute("DROP INDEX IF EXISTS ix_trends_uts_score")
    op.execute("DROP INDEX IF EXISTS ix_trends_user_vertical")
    op.execute("DROP INDEX IF EXISTS ix_trends_user_score")
    op.execute("DROP INDEX IF EXISTS ix_trends_user_id")
    op.execute("DROP INDEX IF EXISTS ix_trends_user_created")
    op.execute("DROP INDEX IF EXISTS ix_trends_url")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_trends_url ON trends (url)")
    op.alter_column('trends', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=True)
    # search_mode: ENUM → VARCHAR
    op.execute("ALTER TABLE trends ALTER COLUMN search_mode DROP DEFAULT")
    op.execute("ALTER TABLE trends ALTER COLUMN search_mode TYPE VARCHAR(20) USING search_mode::text")
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
    op.execute("ALTER TABLE competitors DROP CONSTRAINT IF EXISTS fk_competitors_user_id")
    op.execute("ALTER TABLE competitors DROP CONSTRAINT IF EXISTS uix_competitor_user_username")
    op.execute("DROP INDEX IF EXISTS ix_competitors_user_id")
    op.execute("DROP INDEX IF EXISTS ix_competitors_user_active")
    op.execute("DROP INDEX IF EXISTS ix_competitors_username")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_competitors_username ON competitors (username)")
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
    op.execute("DROP INDEX IF EXISTS ix_chat_user_session")
    op.execute("DROP INDEX IF EXISTS ix_chat_session_created")
    op.execute("DROP INDEX IF EXISTS ix_chat_messages_session_id")
    op.alter_column('chat_messages', 'created_at',
               existing_type=postgresql.TIMESTAMP(),
               nullable=True)
    op.execute("ALTER TABLE chat_messages DROP COLUMN IF EXISTS tokens_used")
    op.execute("ALTER TABLE chat_messages DROP COLUMN IF EXISTS session_id")
    # Drop enum types
    op.execute("DROP TYPE IF EXISTS searchmode")
    op.execute("DROP TYPE IF EXISTS subscriptiontier")
