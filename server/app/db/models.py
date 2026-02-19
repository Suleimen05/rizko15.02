# backend/app/db/models.py
"""
Database models for Rizko.ai
Enterprise-grade SQLAlchemy ORM models with proper relationships,
indexes, and constraints for optimal performance and data integrity.

Architecture:
- User-centric design: All user data is isolated via user_id FK
- Soft deletes: is_active flags for data recovery
- Audit trails: created_at, updated_at timestamps
- Optimized indexes: For common query patterns
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Text, DateTime, Boolean,
    ForeignKey, UniqueConstraint, Index, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
# from pgvector.sqlalchemy import Vector  # Disabled for local dev
import enum

from ..core.database import Base


# =============================================================================
# ENUMS
# =============================================================================

class SubscriptionTier(str, enum.Enum):
    """User subscription tiers with feature access levels."""
    FREE = "free"
    CREATOR = "creator"
    PRO = "pro"
    AGENCY = "agency"


class SearchMode(str, enum.Enum):
    """Search mode types."""
    KEYWORDS = "keywords"
    USERNAME = "username"


class WorkflowStatus(str, enum.Enum):
    """Workflow execution status."""
    DRAFT = "draft"
    READY = "ready"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class WorkflowRunStatus(str, enum.Enum):
    """Workflow run execution status."""
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

# =============================================================================
# USER MODELS
# =============================================================================

class User(Base):
    """
    Core user authentication and profile table.

    Security:
    - Passwords are bcrypt hashed (handled in security.py)
    - OAuth support for Google, GitHub
    - Account status tracking (active, verified)

    Indexes:
    - email: Unique, for login lookups
    - oauth_provider + oauth_id: For OAuth authentication
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)  # Nullable for OAuth users
    full_name = Column(String(255), nullable=True)

    # Subscription & Credits
    subscription_tier = Column(
        SQLEnum(SubscriptionTier, values_callable=lambda x: [e.value for e in x]),
        default=SubscriptionTier.FREE,
        nullable=False
    )
    credits = Column(Integer, default=10, nullable=False)  # Legacy field (kept for backward compatibility)
    credits_reset_at = Column(DateTime, nullable=True)

    # AI Credits System (Phase 1)
    monthly_credits_limit = Column(Integer, default=100, nullable=False)  # Plan-based limit (100/500/2000/10000)
    monthly_credits_used = Column(Integer, default=0, nullable=False)  # Credits spent this month
    bonus_credits = Column(Integer, default=0, nullable=False)  # Bonus credits (never expire)
    rollover_credits = Column(Integer, default=0, nullable=False)  # Credits rolled over from previous month

    # Account status
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)

    # OAuth fields
    oauth_provider = Column(String(50), nullable=True)  # 'google', 'github'
    oauth_id = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_login_at = Column(DateTime, nullable=True)

    # Relationships - cascade delete for user data cleanup
    settings = relationship(
        "UserSettings",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan"
    )
    favorites = relationship(
        "UserFavorite",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )
    searches = relationship(
        "UserSearch",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )
    scripts = relationship(
        "UserScript",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )
    chat_messages = relationship(
        "ChatMessage",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )
    trends = relationship(
        "Trend",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )
    competitors = relationship(
        "Competitor",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )
    accounts = relationship(
        "UserAccount",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )
    chat_sessions = relationship(
        "ChatSession",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )
    workflows = relationship(
        "Workflow",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )
    workflow_runs = relationship(
        "WorkflowRun",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )
    projects = relationship(
        "Project",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )

    # Composite index for OAuth lookups
    __table_args__ = (
        Index('ix_users_oauth', 'oauth_provider', 'oauth_id'),
    )

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}')>"


class UserSettings(Base):
    """
    User preferences and notification settings.
    One-to-one relationship with User.
    """
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True
    )

    # UI Preferences
    dark_mode = Column(Boolean, default=False, nullable=False)
    language = Column(String(10), default="en", nullable=False)
    region = Column(String(10), default="US", nullable=False)
    timezone = Column(String(50), default="UTC", nullable=False)

    # Feature Preferences
    auto_generate_scripts = Column(Boolean, default=True, nullable=False)
    default_search_mode = Column(
        SQLEnum(SearchMode, values_callable=lambda x: [e.value for e in x]),
        default=SearchMode.KEYWORDS,
        nullable=False
    )
    ai_auto_mode = Column(Boolean, default=True, nullable=False)  # Auto-select AI model based on complexity

    # Notification Preferences
    notifications_email = Column(Boolean, default=True, nullable=False)
    notifications_trends = Column(Boolean, default=True, nullable=False)
    notifications_competitors = Column(Boolean, default=True, nullable=False)
    notifications_new_videos = Column(Boolean, default=False, nullable=False)
    notifications_weekly_report = Column(Boolean, default=True, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationship
    user = relationship("User", back_populates="settings")

    def __repr__(self):
        return f"<UserSettings(user_id={self.user_id})>"


# =============================================================================
# TREND MODELS
# =============================================================================

class Trend(Base):
    """
    Discovered TikTok trends with full analytics.

    User Isolation: Each trend belongs to a specific user via user_id FK.
    This ensures users only see their own search results.

    Indexes:
    - user_id: For filtering user's trends
    - platform_id: For deduplication within user scope
    - vertical: For category filtering
    - uts_score: For sorting by viral potential
    - created_at: For time-based queries
    """
    __tablename__ = "trends"

    id = Column(Integer, primary_key=True, index=True)

    # USER ISOLATION - Critical for multi-tenant security
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # TikTok Video Identification
    platform_id = Column(String(100), index=True)  # TikTok video ID
    url = Column(Text, index=True)  # Video URL
    play_addr = Column(Text, nullable=True)  # Direct CDN video playback URL (can be 700+ chars)

    # Content
    description = Column(Text)
    cover_url = Column(Text)  # Supabase or TikTok CDN URL
    vertical = Column(String(100), index=True)  # Search keyword/category

    # Music/Sound Data (for sound cascade analysis)
    music_id = Column(String(100), index=True, nullable=True)
    music_title = Column(String(255), nullable=True)

    # Author Info
    author_username = Column(String(100), index=True)
    author_followers = Column(Integer, default=0)

    # Statistics (current snapshot)
    stats = Column(JSONB, default={}, nullable=False)
    # Initial stats (Point A for velocity calculation)
    initial_stats = Column(JSONB, default={}, nullable=False)

    # Scoring & Analytics
    uts_score = Column(Float, default=0.0, index=True)  # Main viral score
    cluster_id = Column(Integer, nullable=True, index=True)  # Visual clustering
    similarity_score = Column(Float, default=0.0)
    reach_score = Column(Float, default=0.0)
    uplift_score = Column(Float, default=0.0)

    # AI Analysis
    ai_summary = Column(Text, nullable=True)
    # embedding = Column(Vector(512), nullable=True)  # CLIP embedding - disabled for local dev

    # Search Context
    search_query = Column(String(255), nullable=True)  # Original search query
    search_mode = Column(SQLEnum(SearchMode, values_callable=lambda x: [e.value for e in x]), default=SearchMode.KEYWORDS)
    is_deep_scan = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_scanned_at = Column(DateTime, nullable=True)

    # Relationship
    user = relationship("User", back_populates="trends")
    favorites = relationship("UserFavorite", back_populates="trend", cascade="all, delete-orphan")

    # Indexes for common queries
    __table_args__ = (
        # User + platform_id unique constraint (same video once per user)
        UniqueConstraint('user_id', 'platform_id', name='uix_trend_user_platform'),
        # Composite index for user's trends sorted by score
        Index('ix_trends_user_score', 'user_id', 'uts_score'),
        # Composite index for user's trends by vertical
        Index('ix_trends_user_vertical', 'user_id', 'vertical'),
        # Composite index for user's recent trends
        Index('ix_trends_user_created', 'user_id', 'created_at'),
    )

    def __repr__(self):
        return f"<Trend(id={self.id}, user_id={self.user_id}, platform_id='{self.platform_id}')>"


class UserFavorite(Base):
    """
    User's bookmarked/favorited trends.
    Allows users to save interesting trends for later reference.
    """
    __tablename__ = "user_favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    trend_id = Column(
        Integer,
        ForeignKey("trends.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # User notes about this favorite
    notes = Column(Text, nullable=True)
    tags = Column(JSONB, default=[], nullable=False)  # Custom tags

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Project binding (optional)
    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Relationships
    user = relationship("User", back_populates="favorites")
    trend = relationship("Trend", back_populates="favorites")
    project = relationship("Project", back_populates="favorites")

    # Unique constraint: user can favorite a trend only once
    __table_args__ = (
        UniqueConstraint('user_id', 'trend_id', name='uix_favorite_user_trend'),
    )

    def __repr__(self):
        return f"<UserFavorite(user_id={self.user_id}, trend_id={self.trend_id})>"


class UserSearch(Base):
    """
    User's search history for analytics and personalization.
    """
    __tablename__ = "user_searches"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Search parameters
    query = Column(String(255), nullable=False, index=True)
    mode = Column(SQLEnum(SearchMode, values_callable=lambda x: [e.value for e in x]), default=SearchMode.KEYWORDS, nullable=False)
    is_deep = Column(Boolean, default=False, nullable=False)
    filters = Column(JSONB, default={}, nullable=False)

    # Results metadata
    results_count = Column(Integer, default=0, nullable=False)
    execution_time_ms = Column(Integer, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationship
    user = relationship("User", back_populates="searches")

    # Index for recent searches
    __table_args__ = (
        Index('ix_searches_user_created', 'user_id', 'created_at'),
    )

    def __repr__(self):
        return f"<UserSearch(user_id={self.user_id}, query='{self.query}')>"


# =============================================================================
# AI CONTENT MODELS
# =============================================================================

class UserScript(Base):
    """
    AI-generated scripts saved by users.
    """
    __tablename__ = "user_scripts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Script content
    title = Column(String(255), nullable=False)
    hook = Column(Text, nullable=False)  # Opening hook
    body = Column(JSONB, default=[], nullable=False)  # Script sections
    call_to_action = Column(Text, nullable=True)

    # Reference to source trend (optional)
    source_trend_id = Column(
        Integer,
        ForeignKey("trends.id", ondelete="SET NULL"),
        nullable=True
    )

    # Script metadata
    tone = Column(String(50), default="engaging", nullable=False)
    niche = Column(String(100), nullable=True)
    duration_seconds = Column(Integer, default=30, nullable=False)
    language = Column(String(10), default="en", nullable=False)

    # AI metadata
    model_used = Column(String(50), default="gemini", nullable=False)
    viral_elements = Column(JSONB, default=[], nullable=False)
    tips = Column(JSONB, default=[], nullable=False)

    # Organization
    tags = Column(JSONB, default=[], nullable=False)
    is_favorite = Column(Boolean, default=False, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationship
    user = relationship("User", back_populates="scripts")

    # Index for user's scripts
    __table_args__ = (
        Index('ix_scripts_user_created', 'user_id', 'created_at'),
        Index('ix_scripts_user_favorite', 'user_id', 'is_favorite'),
    )

    def __repr__(self):
        return f"<UserScript(id={self.id}, user_id={self.user_id}, title='{self.title[:30]}...')>"


class ChatMessage(Base):
    """
    AI chat conversation history.
    Enables context-aware conversations with the AI assistant.
    """
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Conversation grouping (for multiple chat sessions)
    session_id = Column(String(100), nullable=False, index=True)

    # Message content
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)

    # AI metadata
    model = Column(String(50), nullable=True)  # 'gemini', 'claude'
    mode = Column(String(50), nullable=True)   # 'script', 'ideas', 'analysis'
    tokens_used = Column(Integer, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationship
    user = relationship("User", back_populates="chat_messages")

    # Indexes for conversation retrieval
    __table_args__ = (
        Index('ix_chat_user_session', 'user_id', 'session_id'),
        Index('ix_chat_session_created', 'session_id', 'created_at'),
    )

    def __repr__(self):
        return f"<ChatMessage(id={self.id}, role='{self.role}', session='{self.session_id}')>"


class ChatSession(Base):
    """
    AI chat session metadata.
    Groups chat messages into conversations with titles and metadata.
    """
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Session identification
    session_id = Column(String(100), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False, default="New Chat")

    # Context (optional linked video/trend)
    context_type = Column(String(50), nullable=True)
    context_id = Column(Integer, nullable=True)
    context_data = Column(JSONB, default={}, nullable=False)

    # Session metadata
    model = Column(String(50), default="gemini", nullable=False)
    mode = Column(String(50), default="script", nullable=False)
    message_count = Column(Integer, default=0, nullable=False)
    is_pinned = Column(Boolean, default=False, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="chat_sessions")

    # Indexes
    __table_args__ = (
        Index('ix_chat_sessions_user_updated', 'user_id', 'updated_at'),
    )

    def __repr__(self):
        return f"<ChatSession(id={self.id}, user_id={self.user_id}, title='{self.title[:30]}')>"


# =============================================================================
# COMPETITOR TRACKING
# =============================================================================

class Competitor(Base):
    """
    TikTok profiles tracked by users for competitive analysis.

    User Isolation: Each competitor entry belongs to a specific user.
    Users can track the same TikTok profile independently.
    """
    __tablename__ = "competitors"

    id = Column(Integer, primary_key=True, index=True)

    # USER ISOLATION - Now properly typed as FK
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Profile Info (TikTok or Instagram)
    platform = Column(String(20), nullable=False, default="tiktok", index=True)  # 'tiktok' or 'instagram'
    username = Column(String(100), nullable=False, index=True)
    display_name = Column(String(255), nullable=True)
    avatar_url = Column(String(1000), nullable=True)
    bio = Column(Text, nullable=True)

    # Profile Metrics
    followers_count = Column(Integer, default=0)
    following_count = Column(Integer, default=0)
    total_likes = Column(Integer, default=0)
    total_videos = Column(Integer, default=0)

    # Analytics
    avg_views = Column(Float, default=0.0)
    engagement_rate = Column(Float, default=0.0)
    posting_frequency = Column(Float, default=0.0)  # Videos per week

    # Cached Data
    recent_videos = Column(JSONB, default=[], nullable=False)
    top_hashtags = Column(JSONB, default=[], nullable=False)
    content_categories = Column(JSONB, default={}, nullable=False)

    # Tracking Status
    is_active = Column(Boolean, default=True, nullable=False)

    # User notes
    notes = Column(Text, nullable=True)
    tags = Column(JSONB, default=[], nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_analyzed_at = Column(DateTime, nullable=True)

    # Project binding (optional)
    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Relationships
    user = relationship("User", back_populates="competitors")
    project = relationship("Project", back_populates="competitors")

    # Constraints
    __table_args__ = (
        # Each user can track a username only once
        UniqueConstraint('user_id', 'username', name='uix_competitor_user_username'),
        # Index for user's active competitors
        Index('ix_competitors_user_active', 'user_id', 'is_active'),
    )

    def __repr__(self):
        return f"<Competitor(id={self.id}, user_id={self.user_id}, username='{self.username}')>"


# =============================================================================
# LEGACY / CACHE MODELS
# =============================================================================

class SocialPlatform(str, enum.Enum):
    """Supported social media platforms."""
    TIKTOK = "tiktok"
    INSTAGRAM = "instagram"
    YOUTUBE = "youtube"
    TWITTER = "twitter"  # X
    SNAPCHAT = "snapchat"


class UserAccount(Base):
    """
    User's own social media accounts for tracking growth.

    This is different from Competitor - these are the user's OWN accounts
    that they want to monitor and track progress for.

    Features:
    - Multi-platform support (TikTok, Instagram, YouTube, X, Snapchat)
    - Growth metrics tracking over time
    - Account verification (future: OAuth connection)
    """
    __tablename__ = "user_accounts"

    id = Column(Integer, primary_key=True, index=True)

    # USER ISOLATION
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Platform & Account Info
    platform = Column(SQLEnum(SocialPlatform, values_callable=lambda x: [e.value for e in x]), nullable=False, index=True)
    username = Column(String(100), nullable=False)
    display_name = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    profile_url = Column(String(500), nullable=True)
    bio = Column(Text, nullable=True)

    # Account Metrics (current snapshot)
    followers_count = Column(Integer, default=0)
    following_count = Column(Integer, default=0)
    total_posts = Column(Integer, default=0)
    total_likes = Column(Integer, default=0)
    total_views = Column(Integer, default=0)  # For TikTok/YouTube

    # Analytics
    avg_views = Column(Float, default=0.0)
    avg_likes = Column(Float, default=0.0)
    engagement_rate = Column(Float, default=0.0)
    posting_frequency = Column(Float, default=0.0)  # Posts per week

    # Growth tracking (stored as JSON for flexibility)
    growth_history = Column(JSONB, default=[], nullable=False)
    # Example: [{"date": "2024-01-01", "followers": 1000, "views": 50000}, ...]

    # Cached content
    recent_posts = Column(JSONB, default=[], nullable=False)
    top_posts = Column(JSONB, default=[], nullable=False)

    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)  # OAuth verified
    is_primary = Column(Boolean, default=False, nullable=False)  # Primary account

    # OAuth Token Storage
    platform_user_id = Column(String(255), nullable=True)  # Platform-specific user ID (open_id, channel_id, etc.)
    oauth_access_token = Column(Text, nullable=True)  # Encrypted in production
    oauth_refresh_token = Column(Text, nullable=True)  # Encrypted in production
    oauth_token_expires_at = Column(DateTime, nullable=True)
    oauth_scope = Column(String(500), nullable=True)  # Granted scopes
    oauth_connected_at = Column(DateTime, nullable=True)  # When OAuth was connected

    # User notes
    notes = Column(Text, nullable=True)
    tags = Column(JSONB, default=[], nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_synced_at = Column(DateTime, nullable=True)

    # Relationship
    user = relationship("User", back_populates="accounts")

    # Constraints
    __table_args__ = (
        # Each user can add a platform/username combo only once
        UniqueConstraint('user_id', 'platform', 'username', name='uix_user_platform_username'),
        # Index for user's accounts by platform
        Index('ix_accounts_user_platform', 'user_id', 'platform'),
        # Index for user's active accounts
        Index('ix_accounts_user_active', 'user_id', 'is_active'),
    )

    def __repr__(self):
        return f"<UserAccount(id={self.id}, user_id={self.user_id}, platform='{self.platform.value}', username='{self.username}')>"


class ProfileData(Base):
    """
    Legacy profile cache table.
    Kept for backward compatibility, consider migrating to Competitor table.

    Note: This table is NOT user-isolated and stores global profile data.
    For user-specific tracking, use the Competitor model.
    """
    __tablename__ = "profile_data"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)

    # Channel info cache
    channel_data = Column(JSONB, default={}, nullable=False)
    recent_videos_data = Column(JSONB, default=[], nullable=False)

    # Quick-access metrics
    total_videos = Column(Integer, default=0)
    avg_views = Column(Float, default=0.0)
    engagement_rate = Column(Float, default=0.0)

    # Timestamps
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<ProfileData(username='{self.username}')>"


# =============================================================================
# FEEDBACK MODEL
# =============================================================================

class Feedback(Base):
    """
    User feedback storage.
    Stores feedback, bug reports, feature ideas, and ratings.
    """
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    # Feedback content
    feedback_type = Column(String(20), nullable=False)  # 'idea', 'bug', 'love', 'other'
    message = Column(Text, nullable=False)
    rating = Column(Integer, nullable=True)  # 1-5 stars

    # User info (for non-authenticated users)
    user_email = Column(String(255), nullable=True)

    # Status tracking
    is_read = Column(Boolean, default=False, nullable=False)
    admin_notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", backref="feedback_items")

    def __repr__(self):
        return f"<Feedback(id={self.id}, type='{self.feedback_type}', user_id={self.user_id})>"



# =============================================================================
# WORKFLOW MODELS
# =============================================================================

class Workflow(Base):
    """
    User's saved workflow definitions.
    Stores the full node graph, connections, and per-node configuration as JSONB.
    """
    __tablename__ = "workflows"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Identification
    name = Column(String(255), nullable=False, default="Untitled Workflow")
    description = Column(Text, nullable=True)

    # Graph data: {"nodes": [...], "connections": [...]}
    graph_data = Column(JSONB, default={"nodes": [], "connections": []}, nullable=False)

    # Per-node config overrides
    node_configs = Column(JSONB, default={}, nullable=False)

    # Execution state
    status = Column(
        SQLEnum(WorkflowStatus, values_callable=lambda x: [e.value for e in x]),
        default=WorkflowStatus.DRAFT,
        nullable=False
    )
    last_run_at = Column(DateTime, nullable=True)
    last_run_results = Column(JSONB, default={}, nullable=False)

    # Template metadata
    is_template = Column(Boolean, default=False, nullable=False)
    template_category = Column(String(100), nullable=True)

    # Canvas state (zoom, pan)
    canvas_state = Column(JSONB, default={"zoom": 1, "panX": 0, "panY": 0}, nullable=False)

    # Organization
    tags = Column(JSONB, default=[], nullable=False)
    is_favorite = Column(Boolean, default=False, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="workflows")
    runs = relationship("WorkflowRun", back_populates="workflow", cascade="all, delete-orphan", lazy="dynamic")

    __table_args__ = (
        Index('ix_workflows_user_updated', 'user_id', 'updated_at'),
        Index('ix_workflows_user_status', 'user_id', 'status'),
    )

    def __repr__(self):
        return f"<Workflow(id={self.id}, user_id={self.user_id}, name='{self.name[:30]}')>"


class WorkflowRun(Base):
    """
    Workflow execution history.
    Stores each run of a workflow with inputs, outputs, and metadata.
    """
    __tablename__ = "workflow_runs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    workflow_id = Column(
        Integer,
        ForeignKey("workflows.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Run identification
    workflow_name = Column(String(255), nullable=False)
    run_number = Column(Integer, default=1, nullable=False)

    # Execution status
    status = Column(
        SQLEnum(WorkflowRunStatus, values_callable=lambda x: [e.value for e in x]),
        default=WorkflowRunStatus.RUNNING,
        nullable=False
    )

    # Input snapshot
    input_graph = Column(JSONB, default={}, nullable=False)
    node_count = Column(Integer, default=0, nullable=False)

    # Results
    results = Column(JSONB, default=[], nullable=False)
    final_script = Column(Text, nullable=True)
    storyboard = Column(Text, nullable=True)

    # Metrics
    credits_used = Column(Integer, default=0, nullable=False)
    execution_time_ms = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)

    # Pin
    is_pinned = Column(Boolean, default=False, nullable=False)

    # Timestamps
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="workflow_runs")
    workflow = relationship("Workflow", back_populates="runs")

    __table_args__ = (
        Index('ix_workflow_runs_user_started', 'user_id', 'started_at'),
        Index('ix_workflow_runs_workflow', 'workflow_id', 'started_at'),
    )

    def __repr__(self):
        return f"<WorkflowRun(id={self.id}, workflow='{self.workflow_name}', status={self.status})>"


# =============================================================================
# PROJECT MODELS
# =============================================================================

class Project(Base):
    """
    Content strategy profile for personalizing AI and search.
    Users can have multiple projects (e.g. "Fitness UGC", "Cooking blog").
    """
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    name = Column(String(255), nullable=False)
    icon = Column(String(50), nullable=True)  # emoji or icon code
    status = Column(String(20), default="active", nullable=False)  # active / archived

    # AI-generated profile (from onboarding)
    profile_data = Column(JSONB, default={}, nullable=False)
    # Raw user input (form answers + transcript)
    raw_input = Column(JSONB, default={}, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="projects")
    competitors = relationship("Competitor", back_populates="project")
    favorites = relationship("UserFavorite", back_populates="project")
    video_scores = relationship("ProjectVideoScore", back_populates="project", cascade="all, delete-orphan")
    super_vision_config = relationship(
        "SuperVisionConfig", back_populates="project",
        uselist=False, cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index('ix_projects_user_status', 'user_id', 'status'),
    )

    def __repr__(self):
        return f"<Project(id={self.id}, user_id={self.user_id}, name='{self.name}')>"


class ProjectVideoScore(Base):
    """
    Cached AI relevance scores for videos per project.
    Avoids re-scoring the same video for the same project (TTL 24h).
    """
    __tablename__ = "project_video_scores"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    video_platform_id = Column(String(100), nullable=False, index=True)
    score = Column(Integer, default=0, nullable=False)
    reason = Column(String(255), nullable=True)
    scored_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    project = relationship("Project", back_populates="video_scores")

    __table_args__ = (
        UniqueConstraint('project_id', 'video_platform_id', name='uix_project_video_score'),
    )


# =============================================================================
# SUPER VISION MODELS
# =============================================================================

class SuperVisionStatus(str, enum.Enum):
    """Super Vision config status."""
    ACTIVE = "active"
    PAUSED = "paused"
    ERROR = "error"


class SuperVisionConfig(Base):
    """
    Per-project Super Vision configuration.
    Controls automated video discovery with AI curation + Gemini Vision.
    One config per project (1:1 relationship).
    """
    __tablename__ = "super_vision_configs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True
    )

    # Status
    status = Column(
        SQLEnum(SuperVisionStatus, values_callable=lambda x: [e.value for e in x]),
        default=SuperVisionStatus.PAUSED,
        nullable=False
    )

    # User-configurable filters
    min_views = Column(Integer, default=500000, nullable=False)
    date_range_days = Column(Integer, default=7, nullable=False)
    platform = Column(String(20), default="tiktok", nullable=False)
    scan_interval_hours = Column(Integer, default=12, nullable=False)  # min 8
    max_vision_videos = Column(Integer, default=5, nullable=False)     # 1-10

    # Override keywords (optional — if empty, uses project profile keywords)
    custom_keywords = Column(JSONB, default=[], nullable=False)

    # Scoring thresholds
    text_score_threshold = Column(Integer, default=70, nullable=False)

    # Scheduling state
    last_run_at = Column(DateTime, nullable=True)
    next_run_at = Column(DateTime, nullable=True)
    last_run_status = Column(String(50), nullable=True)
    last_run_stats = Column(JSONB, default={}, nullable=False)
    scheduler_job_id = Column(String(100), nullable=True)

    # Error tracking
    consecutive_errors = Column(Integer, default=0, nullable=False)
    last_error = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User")
    project = relationship("Project", back_populates="super_vision_config")
    results = relationship(
        "SuperVisionResult", back_populates="config",
        cascade="all, delete-orphan", lazy="dynamic"
    )

    __table_args__ = (
        Index('ix_sv_configs_user_status', 'user_id', 'status'),
        Index('ix_sv_configs_next_run', 'status', 'next_run_at'),
    )

    def __repr__(self):
        return f"<SuperVisionConfig(id={self.id}, project_id={self.project_id}, status={self.status.value})>"


class SuperVisionResult(Base):
    """
    Curated video result from a Super Vision scan.
    Contains both text-based and vision-based AI scoring.
    """
    __tablename__ = "super_vision_results"

    id = Column(Integer, primary_key=True, index=True)
    config_id = Column(
        Integer,
        ForeignKey("super_vision_configs.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Video data (denormalized for fast queries without JOIN)
    video_platform_id = Column(String(100), nullable=False, index=True)
    video_url = Column(Text, nullable=False)
    video_cover_url = Column(Text, nullable=True)
    video_play_addr = Column(Text, nullable=True)
    video_description = Column(Text, nullable=True)
    video_author = Column(String(100), nullable=True)
    video_stats = Column(JSONB, default={}, nullable=False)

    # AI Text Scoring (from batch_ai_score)
    text_score = Column(Integer, default=0, nullable=False)
    text_reason = Column(String(255), nullable=True)

    # Gemini Vision Scoring
    vision_score = Column(Integer, nullable=True)
    vision_analysis = Column(Text, nullable=True)
    vision_match_reason = Column(String(500), nullable=True)

    # Combined final score (40% text + 60% vision, or text-only if no vision)
    final_score = Column(Integer, default=0, nullable=False)

    # Metadata
    scan_batch_id = Column(String(50), nullable=False)
    is_dismissed = Column(Boolean, default=False, nullable=False)
    is_saved = Column(Boolean, default=False, nullable=False)

    # Timestamps
    found_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    config = relationship("SuperVisionConfig", back_populates="results")
    user = relationship("User")
    project = relationship("Project")

    __table_args__ = (
        UniqueConstraint('config_id', 'video_platform_id', name='uix_sv_result_config_video'),
        Index('ix_sv_results_project_score', 'project_id', 'final_score'),
        Index('ix_sv_results_config_batch', 'config_id', 'scan_batch_id'),
        Index('ix_sv_results_user_found', 'user_id', 'found_at'),
    )

    def __repr__(self):
        return f"<SuperVisionResult(id={self.id}, video={self.video_platform_id}, score={self.final_score})>"
