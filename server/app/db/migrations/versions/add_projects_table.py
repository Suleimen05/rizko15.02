"""add projects table and project_id FK to favorites/competitors

Revision ID: add_projects
Revises: add_wfrun_pinned
Create Date: 2026-02-18 12:00:00.000000

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = 'add_projects'
down_revision = 'add_wfrun_pinned'
branch_labels = None
depends_on = None


def upgrade():
    # Create projects table
    op.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            icon VARCHAR(50),
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            profile_data JSONB NOT NULL DEFAULT '{}',
            raw_input JSONB NOT NULL DEFAULT '{}',
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_projects_user_id ON projects(user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_projects_user_status ON projects(user_id, status)")

    # Create project_video_scores table
    op.execute("""
        CREATE TABLE IF NOT EXISTS project_video_scores (
            id SERIAL PRIMARY KEY,
            project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            video_platform_id VARCHAR(100) NOT NULL,
            score INTEGER NOT NULL DEFAULT 0,
            reason VARCHAR(255),
            scored_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_pvs_project_id ON project_video_scores(project_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_pvs_video_platform_id ON project_video_scores(video_platform_id)")
    op.execute("""
        ALTER TABLE project_video_scores
        ADD CONSTRAINT uix_project_video_score UNIQUE (project_id, video_platform_id)
    """)

    # Add project_id to user_favorites
    op.execute("ALTER TABLE user_favorites ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL")
    op.execute("CREATE INDEX IF NOT EXISTS ix_user_favorites_project_id ON user_favorites(project_id)")

    # Add project_id to competitors
    op.execute("ALTER TABLE competitors ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL")
    op.execute("CREATE INDEX IF NOT EXISTS ix_competitors_project_id ON competitors(project_id)")


def downgrade():
    op.execute("ALTER TABLE competitors DROP COLUMN IF EXISTS project_id")
    op.execute("ALTER TABLE user_favorites DROP COLUMN IF EXISTS project_id")
    op.execute("DROP TABLE IF EXISTS project_video_scores")
    op.execute("DROP TABLE IF EXISTS projects")
