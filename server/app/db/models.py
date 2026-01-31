# backend/app/db/models.py
"""
Database models for Risko.ai
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
from pgvector.sqlalchemy import Vector
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
        SQLEnum(SubscriptionTier),
        default=SubscriptionTier.FREE,
        nullable=False
    )
    credits = Column(Integer, default=10, nullable=False)
    credits_reset_at = Column(DateTime, nullable=True)

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
        SQLEnum(SearchMode),
        default=SearchMode.KEYWORDS,
        nullable=False
    )

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
    url = Column(String(500), index=True)  # Video URL

    # Content
    description = Column(Text)
    cover_url = Column(String(500))
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
    embedding = Column(Vector(512), nullable=True)  # CLIP embedding

    # Search Context
    search_query = Column(String(255), nullable=True)  # Original search query
    search_mode = Column(SQLEnum(SearchMode), default=SearchMode.KEYWORDS)
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

    # Relationships
    user = relationship("User", back_populates="favorites")
    trend = relationship("Trend", back_populates="favorites")

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
    mode = Column(SQLEnum(SearchMode), default=SearchMode.KEYWORDS, nullable=False)
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

    # TikTok Profile Info
    username = Column(String(100), nullable=False, index=True)
    display_name = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)
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

    # Relationship
    user = relationship("User", back_populates="competitors")

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
    platform = Column(SQLEnum(SocialPlatform), nullable=False, index=True)
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
