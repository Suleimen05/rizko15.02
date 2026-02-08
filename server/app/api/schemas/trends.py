"""
Pydantic schemas for Trend Search & Analysis.

Includes validation for:
- Search requests with tier-based access control
- Trend response data
- UTS breakdown analytics
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator
from enum import Enum


# =============================================================================
# ENUMS
# =============================================================================

class SearchMode(str, Enum):
    """Search mode types."""
    KEYWORDS = "keywords"
    USERNAME = "username"


class Platform(str, Enum):
    """Supported social media platforms."""
    TIKTOK = "tiktok"
    INSTAGRAM = "instagram"


class SubscriptionTier(str, Enum):
    """User subscription tiers."""
    FREE = "free"
    CREATOR = "creator"
    PRO = "pro"
    AGENCY = "agency"


# =============================================================================
# SEARCH REQUEST SCHEMAS
# =============================================================================

class SearchRequest(BaseModel):
    """
    Unified search request schema.

    Supports both keyword search and username profile analysis.
    Deep Analyze requires Pro/Agency tier.
    Multi-platform support: TikTok and Instagram.
    """
    target: Optional[str] = Field(
        None,
        max_length=200,
        description="Search query or @username"
    )
    keywords: Optional[List[str]] = Field(
        default=[],
        max_items=10,
        description="Keywords for search (legacy support)"
    )
    mode: SearchMode = Field(
        default=SearchMode.KEYWORDS,
        description="Search mode: keywords or username"
    )
    platform: Platform = Field(
        default=Platform.TIKTOK,
        description="Platform to search: tiktok or instagram"
    )
    business_desc: Optional[str] = Field(
        default="",
        max_length=500,
        description="Business description for relevance scoring"
    )
    is_deep: bool = Field(
        default=False,
        description="Enable Deep Analyze (Pro/Agency only)"
    )
    time_window: Optional[str] = Field(
        None,
        description="Time filter: 24h, 7d, 30d"
    )
    rescan_hours: int = Field(
        default=24,
        ge=1,
        le=168,
        description="Hours until auto-rescan (1-168)"
    )

    @field_validator('target')
    @classmethod
    def sanitize_target(cls, v: Optional[str]) -> Optional[str]:
        """Sanitize search target."""
        if v is None:
            return v
        # Remove dangerous characters but keep @ for usernames
        import re
        sanitized = re.sub(r'[<>"\';]', '', v)
        return sanitized.strip()

    @field_validator('keywords')
    @classmethod
    def sanitize_keywords(cls, v: List[str]) -> List[str]:
        """Sanitize keywords list."""
        import re
        return [
            re.sub(r'[<>"\';]', '', kw).strip()
            for kw in v
            if kw and len(kw.strip()) > 0
        ][:10]  # Limit to 10 keywords


# =============================================================================
# STATS SCHEMAS
# =============================================================================

class VideoStats(BaseModel):
    """Video statistics."""
    playCount: int = Field(default=0, ge=0)
    diggCount: int = Field(default=0, ge=0)
    commentCount: int = Field(default=0, ge=0)
    shareCount: int = Field(default=0, ge=0)
    collectCount: Optional[int] = Field(default=0, ge=0)


class AuthorInfo(BaseModel):
    """Author/creator information."""
    id: Optional[str] = None
    uniqueId: str
    nickname: Optional[str] = None
    avatar: Optional[str] = None
    followerCount: int = Field(default=0, ge=0)
    followingCount: int = Field(default=0, ge=0)
    heartCount: int = Field(default=0, ge=0)
    videoCount: int = Field(default=0, ge=0)
    verified: bool = False


class MusicInfo(BaseModel):
    """Music/sound information."""
    id: Optional[str] = None
    title: str = "Original Sound"
    authorName: Optional[str] = None
    original: bool = True
    playUrl: Optional[str] = None


class VideoInfo(BaseModel):
    """Video metadata."""
    duration: int = Field(default=0, ge=0)
    ratio: str = "9:16"
    cover: Optional[str] = None
    playAddr: Optional[str] = None
    downloadAddr: Optional[str] = None


class HashtagInfo(BaseModel):
    """Hashtag information."""
    id: Optional[str] = None
    name: str
    title: Optional[str] = None
    desc: Optional[str] = None
    stats: Optional[Dict[str, int]] = None


# =============================================================================
# UTS BREAKDOWN (DEEP ANALYZE)
# =============================================================================

class UTSBreakdown(BaseModel):
    """
    6-Layer UTS Score Breakdown.

    Only available with Deep Analyze (Pro/Agency).
    """
    l1_viral_lift: float = Field(
        default=0.0,
        ge=0,
        le=100,
        description="Layer 1: Viral Lift Score"
    )
    l2_velocity: float = Field(
        default=0.0,
        ge=0,
        le=100,
        description="Layer 2: Growth Velocity"
    )
    l3_retention: float = Field(
        default=0.0,
        ge=0,
        le=100,
        description="Layer 3: Save/Bookmark Rate"
    )
    l4_cascade: float = Field(
        default=0.0,
        ge=0,
        le=100,
        description="Layer 4: Sound Cascade Score"
    )
    l5_saturation: float = Field(
        default=0.0,
        ge=0,
        le=100,
        description="Layer 5: Market Saturation"
    )
    l7_stability: float = Field(
        default=0.0,
        ge=0,
        le=100,
        description="Layer 7: Stability Index"
    )
    final_score: float = Field(
        default=0.0,
        ge=0,
        le=100,
        description="Final weighted UTS Score"
    )


# =============================================================================
# TREND RESPONSE SCHEMAS
# =============================================================================

class TrendBase(BaseModel):
    """Base trend data."""
    id: Optional[str] = None  # platform_id for frontend video display
    trend_id: Optional[int] = None  # Database ID for favorites
    platform_id: Optional[str] = None
    url: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    cover_url: Optional[str] = None
    author_username: Optional[str] = None


class TrendLight(TrendBase):
    """
    Light Analyze response (FREE/CREATOR).

    Basic metrics without deep analytics.
    """
    author: Optional[AuthorInfo] = None
    stats: VideoStats
    video: Optional[VideoInfo] = None
    music: Optional[MusicInfo] = None
    hashtags: List[HashtagInfo] = []
    createdAt: Optional[str] = None

    # Light metrics
    viralScore: float = Field(default=0.0, ge=0, le=100)
    engagementRate: float = Field(default=0.0, ge=0)

    model_config = {"from_attributes": True}


class TrendDeep(TrendLight):
    """
    Deep Analyze response (PRO/AGENCY).

    Full analytics with UTS breakdown.
    """
    # Deep analyze fields
    uts_score: float = Field(default=0.0, ge=0, le=100)
    uts_breakdown: Optional[UTSBreakdown] = None

    # Clustering
    cluster_id: Optional[int] = None

    # Additional deep metrics
    saturation_score: Optional[float] = None
    cascade_count: Optional[int] = None
    cascade_score: Optional[float] = None
    velocity_score: Optional[float] = None

    # Historical data
    initial_stats: Optional[VideoStats] = None
    last_scanned_at: Optional[datetime] = None


class ClusterInfo(BaseModel):
    """Visual cluster information."""
    cluster_id: int
    video_count: int
    avg_uts: float


# =============================================================================
# SEARCH RESPONSE SCHEMAS
# =============================================================================

class SearchResponseLight(BaseModel):
    """Response for Light Analyze search."""
    status: str = "ok"
    mode: str = "light"
    items: List[TrendLight]
    total: int = Field(default=0, ge=0)
    query: Optional[str] = None
    cached: bool = False


class SearchResponseDeep(BaseModel):
    """Response for Deep Analyze search."""
    status: str = "ok"
    mode: str = "deep"
    items: List[TrendDeep]
    clusters: List[ClusterInfo] = []
    total: int = Field(default=0, ge=0)
    query: Optional[str] = None
    rescan_scheduled_at: Optional[datetime] = None


# =============================================================================
# SAVED TRENDS SCHEMAS
# =============================================================================

class SavedTrendResponse(BaseModel):
    """Response for user's saved trends."""
    id: int
    user_id: int
    platform_id: Optional[str] = None
    url: Optional[str] = None
    description: Optional[str] = None
    cover_url: Optional[str] = None
    author_username: Optional[str] = None
    stats: Dict[str, Any] = {}
    uts_score: float = 0.0
    vertical: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TrendListResponse(BaseModel):
    """Paginated list of user's trends."""
    items: List[SavedTrendResponse]
    total: int
    page: int = 1
    per_page: int = 20
    has_more: bool = False
