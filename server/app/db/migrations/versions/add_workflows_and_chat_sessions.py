"""add chat_sessions, workflows, and workflow_runs tables

Revision ID: add_wf_chat
Revises: increase_avatar_url
Create Date: 2026-02-07 21:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, ENUM


# revision identifiers, used by Alembic.
revision = 'add_wf_chat'
down_revision = 'increase_avatar_url'
branch_labels = None
depends_on = None


def upgrade():
    # =========================================================================
    # Create enum types (if they don't already exist)
    # =========================================================================
    workflow_status = ENUM(
        'draft', 'ready', 'running', 'completed', 'failed',
        name='workflowstatus', create_type=False
    )
    workflow_run_status = ENUM(
        'running', 'completed', 'failed', 'cancelled',
        name='workflowrunstatus', create_type=False
    )

    # Create enums explicitly with checkfirst
    op.execute("DO $$ BEGIN CREATE TYPE workflowstatus AS ENUM ('draft','ready','running','completed','failed'); EXCEPTION WHEN duplicate_object THEN null; END $$;")
    op.execute("DO $$ BEGIN CREATE TYPE workflowrunstatus AS ENUM ('running','completed','failed','cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$;")

    # =========================================================================
    # 1. chat_sessions table
    # =========================================================================
    op.create_table(
        'chat_sessions',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('session_id', sa.String(100), unique=True, nullable=False),
        sa.Column('title', sa.String(255), nullable=False, server_default='New Chat'),
        sa.Column('context_type', sa.String(50), nullable=True),
        sa.Column('context_id', sa.Integer(), nullable=True),
        sa.Column('context_data', JSONB(), nullable=False, server_default='{}'),
        sa.Column('model', sa.String(50), nullable=False, server_default='gemini'),
        sa.Column('mode', sa.String(50), nullable=False, server_default='script'),
        sa.Column('message_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_chat_sessions_id', 'chat_sessions', ['id'])
    op.create_index('ix_chat_sessions_user_id', 'chat_sessions', ['user_id'])
    op.create_index('ix_chat_sessions_session_id', 'chat_sessions', ['session_id'], unique=True)
    op.create_index('ix_chat_sessions_user_updated', 'chat_sessions', ['user_id', 'updated_at'])

    # =========================================================================
    # 2. workflows table
    # =========================================================================
    op.create_table(
        'workflows',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False, server_default='Untitled Workflow'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('graph_data', JSONB(), nullable=False, server_default='{"nodes": [], "connections": []}'),
        sa.Column('node_configs', JSONB(), nullable=False, server_default='{}'),
        sa.Column('status', workflow_status, nullable=False, server_default='draft'),
        sa.Column('last_run_at', sa.DateTime(), nullable=True),
        sa.Column('last_run_results', JSONB(), nullable=False, server_default='{}'),
        sa.Column('is_template', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('template_category', sa.String(100), nullable=True),
        sa.Column('canvas_state', JSONB(), nullable=False, server_default='{"zoom": 1, "panX": 0, "panY": 0}'),
        sa.Column('tags', JSONB(), nullable=False, server_default='[]'),
        sa.Column('is_favorite', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_workflows_id', 'workflows', ['id'])
    op.create_index('ix_workflows_user_id', 'workflows', ['user_id'])
    op.create_index('ix_workflows_user_updated', 'workflows', ['user_id', 'updated_at'])
    op.create_index('ix_workflows_user_status', 'workflows', ['user_id', 'status'])

    # =========================================================================
    # 3. workflow_runs table
    # =========================================================================
    op.create_table(
        'workflow_runs',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('workflow_id', sa.Integer(), sa.ForeignKey('workflows.id', ondelete='SET NULL'), nullable=True),
        sa.Column('workflow_name', sa.String(255), nullable=False),
        sa.Column('run_number', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('status', workflow_run_status, nullable=False, server_default='running'),
        sa.Column('input_graph', JSONB(), nullable=False, server_default='{}'),
        sa.Column('node_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('results', JSONB(), nullable=False, server_default='[]'),
        sa.Column('final_script', sa.Text(), nullable=True),
        sa.Column('storyboard', sa.Text(), nullable=True),
        sa.Column('credits_used', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('execution_time_ms', sa.Integer(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_workflow_runs_id', 'workflow_runs', ['id'])
    op.create_index('ix_workflow_runs_user_id', 'workflow_runs', ['user_id'])
    op.create_index('ix_workflow_runs_workflow_id', 'workflow_runs', ['workflow_id'])
    op.create_index('ix_workflow_runs_user_started', 'workflow_runs', ['user_id', 'started_at'])
    op.create_index('ix_workflow_runs_workflow', 'workflow_runs', ['workflow_id', 'started_at'])


def downgrade():
    # Drop tables in reverse order (respect FK dependencies)
    op.drop_table('workflow_runs')
    op.drop_table('workflows')
    op.drop_table('chat_sessions')

    # Drop enum types
    op.execute("DROP TYPE IF EXISTS workflowrunstatus")
    op.execute("DROP TYPE IF EXISTS workflowstatus")
