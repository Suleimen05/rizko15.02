"""
Pydantic schemas for Competitor Tracking.

Handles:
- Adding/removing competitors
- Competitor analytics
- Spy mode data
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator
import re


# =============================================================================
# REQUEST SCHEMAS
# =============================================================================

class CompetitorCreate(BaseModel):
    """Schema for adding a competitor to track."""
    username: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Username to track (TikTok or Instagram)"
    )
    platform: str = Field(
        default="tiktok",
        description="Platform: tiktok or instagram"
    )
    notes: str = Field(
        default="",
        max_length=1000,
        description="Personal notes about this competitor"
    )
    tags: List[str] = Field(
        default=[],
        max_items=10,
        description="Custom tags for organization"
    )
    # Optional: pass search data to skip Apify call
    search_data: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Pre-fetched search data to avoid duplicate Apify call"
    )
    project_id: Optional[int] = Field(
        default=None,
        description="Project ID to bind competitor to"
    )

    @field_validator('username')
    @classmethod
    def sanitize_username(cls, v: str) -> str:
        """Clean and normalize username."""
        # Remove @ and sanitize
        cleaned = v.lower().strip().replace("@", "")
        # Only allow alphanumeric, underscore, and period
        if not re.match(r'^[a-z0-9_.]+$', cleaned):
            raise ValueError('Invalid TikTok username format')
        return cleaned

    @field_validator('notes')
    @classmethod
    def sanitize_notes(cls, v: str) -> str:
        """Sanitize notes."""
        sanitized = re.sub(r'[<>]', '', v)
        return sanitized.strip()

    @field_validator('tags')
    @classmethod
    def sanitize_tags(cls, v: List[str]) -> List[str]:
        """Sanitize and normalize tags."""
        sanitized = []
        for tag in v[:10]:
            clean_tag = re.sub(r'[<>"\';]', '', tag).strip().lower()
            if clean_tag and len(clean_tag) <= 50:
                sanitized.append(clean_tag)
        return list(set(sanitized))


class CompetitorUpdate(BaseModel):
    """Schema for updating competitor data."""
    notes: Optional[str] = Field(None, max_length=1000)
    tags: Optional[List[str]] = Field(None, max_items=10)
    is_active: Optional[bool] = None

    @field_validator('notes')
    @classmethod
    def sanitize_notes(cls, v: Optional[str]) -> Optional[str]:
        """Sanitize notes."""
        if v is None:
            return v
        sanitized = re.sub(r'[<>]', '', v)
        return sanitized.strip()


# =============================================================================
# SEARCH SCHEMAS
# =============================================================================

class ChannelSearchResult(BaseModel):
    """Result from channel search (before adding)."""
    username: str
    nickname: str
    avatar: str
    follower_count: int
    video_count: int
    platform: str = "tiktok"


# =============================================================================
# VIDEO SCHEMAS (for competitor videos)
# =============================================================================

class CompetitorVideoStats(BaseModel):
    """Stats for a competitor's video."""
    playCount: int = 0
    diggCount: int = 0
    commentCount: int = 0
    shareCount: int = 0


class CompetitorVideo(BaseModel):
    """A video from a competitor."""
    id: str
    title: str
    url: str
    cover_url: Optional[str] = None
    uploaded_at: Optional[int] = None  # Unix timestamp
    views: int = 0
    stats: CompetitorVideoStats
    uts_score: float = 0.0
    author: Optional[Dict[str, Any]] = None


# =============================================================================
# RESPONSE SCHEMAS
# =============================================================================

class CompetitorResponse(BaseModel):
    """Full competitor response."""
    id: int
    user_id: int
    platform: str = "tiktok"  # 'tiktok' or 'instagram'
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None

    # Metrics
    followers_count: int = 0
    following_count: int = 0
    total_likes: int = 0
    total_videos: int = 0
    avg_views: float = 0.0
    engagement_rate: float = 0.0
    posting_frequency: float = 0.0

    # Tracking
    is_active: bool = True
    notes: Optional[str] = None
    tags: List[str] = []

    # Timestamps
    created_at: datetime
    updated_at: datetime
    last_analyzed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class CompetitorListResponse(BaseModel):
    """Paginated list of competitors."""
    items: List[CompetitorResponse]
    total: int
    page: int = 1
    per_page: int = 20
    has_more: bool = False


# =============================================================================
# SPY MODE SCHEMAS
# =============================================================================

class ChannelData(BaseModel):
    """Channel/profile data."""
    nickName: str
    uniqueId: str
    avatarThumb: Optional[str] = None
    fans: int = 0
    videos: int = 0
    likes: int = 0
    following: int = 0


class CompetitorMetrics(BaseModel):
    """Calculated metrics for competitor."""
    avg_views: int = 0
    engagement_rate: float = 0.0
    posting_frequency: float = 0.0
    best_posting_time: Optional[str] = None
    content_consistency: Optional[float] = None


class SpyModeResponse(BaseModel):
    """Full spy mode analysis response."""
    username: str
    channel_data: ChannelData
    top_3_hits: List[CompetitorVideo]
    latest_feed: List[CompetitorVideo]
    metrics: CompetitorMetrics
    hashtag_analysis: Optional[Dict[str, int]] = None
    content_categories: Optional[Dict[str, float]] = None
    last_analyzed_at: Optional[datetime] = None


# =============================================================================
# BULK OPERATIONS
# =============================================================================

class BulkCompetitorAction(BaseModel):
    """Bulk action on competitors."""
    usernames: List[str] = Field(
        ...,
        min_items=1,
        max_items=20,
        description="List of usernames"
    )
    action: str = Field(
        ...,
        description="Action: add, remove, refresh"
    )

    @field_validator('action')
    @classmethod
    def validate_action(cls, v: str) -> str:
        """Validate action type."""
        allowed = ['add', 'remove', 'refresh']
        if v.lower() not in allowed:
            raise ValueError(f'Action must be one of: {allowed}')
        return v.lower()


class BulkActionResult(BaseModel):
    """Result of bulk operation."""
    success_count: int
    failed_count: int
    results: List[Dict[str, Any]] = []
    errors: List[str] = []


# =============================================================================
# FEED SCHEMAS (NEW!)
# =============================================================================

class CompetitorFeedVideo(BaseModel):
    """Video in competitor feed with is_new flag."""
    id: str
    title: str
    description: str = ""
    thumbnail_url: Optional[str] = None
    video_url: Optional[str] = None  # URL for video playback
    url: str
    stats: CompetitorVideoStats
    posted_at: str  # ISO 8601 datetime string
    uts_score: Optional[float] = None
    is_new: bool = False


class CompetitorFeedProfile(BaseModel):
    """Profile data for feed page."""
    username: str
    nickname: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    followers_count: int = 0
    total_videos: int = 0
    avg_views: float = 0.0
    engagement_rate: float = 0.0
    created_at: str  # ISO 8601 datetime string
    last_checked_at: Optional[str] = None


class CompetitorFeedResponse(BaseModel):
    """Complete feed response with profile and videos."""
    profile: CompetitorFeedProfile
    videos: List[CompetitorFeedVideo]
