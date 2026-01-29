# backend/app/api/competitors.py
"""
Competitor Tracking API.

Enterprise-grade competitor analysis with:
- User data isolation via JWT authentication
- Proper foreign key relationships
- Rate limiting based on subscription tier
"""
import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..core.database import get_db
from ..db.models import Competitor, ProfileData, User
from ..services.collector import TikTokCollector
from ..services.scorer import TrendScorer
from .dependencies import get_current_user, check_rate_limit, CreditManager
from .schemas.competitors import (
    CompetitorCreate,
    CompetitorUpdate,
    CompetitorResponse,
    CompetitorListResponse,
    ChannelSearchResult,
    SpyModeResponse,
    ChannelData,
    CompetitorMetrics,
    CompetitorVideo,
    CompetitorVideoStats
)

logger = logging.getLogger(__name__)

router = APIRouter()


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def fix_tt_url(url: str) -> Optional[str]:
    """Fix TikTok image URLs for compatibility."""
    if not url or not isinstance(url, str):
        return None
    if ".heic" in url:
        return url.replace(".heic", ".jpeg")
    return url


def normalize_video_data(item: dict) -> dict:
    """
    Normalize video data from various Apify response formats.
    """
    stats = item.get("stats") or {}
    views = item.get("views") or item.get("playCount") or stats.get("playCount") or 0
    likes = item.get("likes") or item.get("diggCount") or stats.get("diggCount") or 0
    comments = item.get("comments") or item.get("commentCount") or stats.get("commentCount") or 0
    shares = item.get("shares") or item.get("shareCount") or stats.get("shareCount") or 0

    uploaded_at = item.get("uploadedAt") or item.get("createTime") or 0

    channel = item.get("channel") or item.get("authorMeta") or {}
    author_name = channel.get("username") or channel.get("name") or "unknown"
    avatar = fix_tt_url(channel.get("avatar") or channel.get("avatarThumb"))

    video_obj = item.get("video") or item.get("videoMeta") or {}
    cover = fix_tt_url(video_obj.get("cover") or video_obj.get("coverUrl") or item.get("cover_url"))

    return {
        "id": str(item.get("id")),
        "title": item.get("title") or item.get("desc") or "",
        "url": item.get("postPage") or item.get("webVideoUrl") or item.get("url"),
        "cover_url": cover,
        "uploaded_at": uploaded_at,
        "views": int(views),
        "stats": {
            "playCount": int(views),
            "diggCount": int(likes),
            "commentCount": int(comments),
            "shareCount": int(shares)
        },
        "author": {
            "username": author_name,
            "avatar": avatar,
            "followers": channel.get("followers") or channel.get("fans") or 0
        }
    }


# =============================================================================
# SEARCH ENDPOINTS
# =============================================================================

@router.get("/search/{username}", response_model=ChannelSearchResult)
def search_channel(
    username: str,
    current_user: User = Depends(check_rate_limit)
):
    """
    Search for a TikTok channel by username.

    Returns basic profile info for preview before adding.
    No database storage - just live search.
    """
    clean_username = username.lower().strip().replace("@", "")

    logger.info(f"🔍 User {current_user.id} searching channel: @{clean_username}")

    collector = TikTokCollector()
    raw_videos = collector.collect([clean_username], limit=5, mode="profile")

    if not raw_videos:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Channel @{clean_username} not found"
        )

    # Extract profile info from first video
    first_vid = normalize_video_data(raw_videos[0])
    author_info = first_vid["author"]

    return ChannelSearchResult(
        username=clean_username,
        nickname=author_info["username"],
        avatar=author_info["avatar"] or "",
        follower_count=author_info["followers"],
        video_count=len(raw_videos),
        platform="tiktok"
    )


# =============================================================================
# CRUD OPERATIONS
# =============================================================================

@router.get("/", response_model=CompetitorListResponse)
def get_all_competitors(
    page: int = 1,
    per_page: int = 20,
    active_only: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get paginated list of tracked competitors.

    User Isolation: Only returns competitors belonging to the authenticated user.
    """
    query = db.query(Competitor).filter(Competitor.user_id == current_user.id)

    if active_only:
        query = query.filter(Competitor.is_active == True)

    total = query.count()
    offset = (page - 1) * per_page

    competitors = query.order_by(
        Competitor.created_at.desc()
    ).offset(offset).limit(per_page).all()

    items = [
        CompetitorResponse(
            id=c.id,
            user_id=c.user_id,
            username=c.username,
            display_name=c.display_name,
            avatar_url=c.avatar_url,
            bio=c.bio,
            followers_count=c.followers_count,
            following_count=c.following_count,
            total_likes=c.total_likes,
            total_videos=c.total_videos,
            avg_views=c.avg_views,
            engagement_rate=c.engagement_rate,
            posting_frequency=c.posting_frequency,
            is_active=c.is_active,
            notes=c.notes,
            tags=c.tags or [],
            created_at=c.created_at,
            updated_at=c.updated_at,
            last_analyzed_at=c.last_analyzed_at
        )
        for c in competitors
    ]

    return CompetitorListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        has_more=(offset + len(competitors)) < total
    )


@router.post("/", response_model=CompetitorResponse, status_code=status.HTTP_201_CREATED)
async def add_competitor(
    data: CompetitorCreate,
    current_user: User = Depends(check_rate_limit),
    db: Session = Depends(get_db)
):
    """
    Add a new competitor to track.

    User Isolation: Competitor is linked to authenticated user only.
    Deducts credits for the operation.
    """
    clean_username = data.username.lower().strip().replace("@", "")

    # Check if already tracking this competitor
    existing = db.query(Competitor).filter(
        Competitor.user_id == current_user.id,
        Competitor.username == clean_username
    ).first()

    if existing:
        if existing.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Competitor @{clean_username} already in your tracking list"
            )
        else:
            # Reactivate existing competitor
            existing.is_active = True
            existing.notes = data.notes or existing.notes
            existing.tags = data.tags or existing.tags
            db.commit()
            db.refresh(existing)
            logger.info(f"🔄 User {current_user.id} reactivated competitor @{clean_username}")
            return CompetitorResponse.model_validate(existing)

    # Deduct credits
    await CreditManager.check_and_deduct("competitor_add", current_user, db)

    logger.info(f"🔍 User {current_user.id} adding competitor: @{clean_username}")

    # Check if search_data was passed (optimization: skip Apify call)
    if data.search_data:
        logger.info(f"⚡ Using cached search data for @{clean_username} (no Apify call)")

        # Use pre-fetched data from search
        avatar_url = data.search_data.get("avatar") or data.search_data.get("avatar_url") or ""
        followers_count = data.search_data.get("follower_count") or data.search_data.get("followers_count") or 0
        video_count = data.search_data.get("video_count") or 0
        display_name = data.search_data.get("nickname") or data.search_data.get("username") or clean_username

        # Create competitor with minimal data (no videos yet)
        competitor = Competitor(
            user_id=current_user.id,
            username=clean_username,
            display_name=display_name,
            avatar_url=avatar_url,
            bio="",
            followers_count=followers_count,
            total_videos=video_count,
            avg_views=0,
            engagement_rate=0,
            posting_frequency=0.0,
            recent_videos=[],
            top_hashtags=[],
            content_categories={},
            is_active=True,
            last_analyzed_at=datetime.utcnow(),
            notes=data.notes,
            tags=data.tags or []
        )

        db.add(competitor)
        db.commit()
        db.refresh(competitor)

        logger.info(f"✅ User {current_user.id} added competitor @{clean_username} (fast mode)")
        return CompetitorResponse.model_validate(competitor)

    # Fallback: Fetch profile data from Apify (slower)
    logger.info(f"📡 Fetching @{clean_username} from Apify (no cached data)")

    collector = TikTokCollector()
    raw_videos = collector.collect([clean_username], limit=30, mode="profile")

    if not raw_videos:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"TikTok profile @{clean_username} not found"
        )

    # Process videos
    scorer = TrendScorer()
    clean_videos = []
    total_views = 0
    total_engagement = 0

    for raw in raw_videos:
        vid = normalize_video_data(raw)

        # Calculate UTS for each video
        scorer_data = {
            "views": vid["views"],
            "author_followers": vid["author"]["followers"],
            "collect_count": 0,
            "share_count": vid["stats"]["shareCount"]
        }
        vid["uts_score"] = scorer.calculate_uts(scorer_data, history_data=None, cascade_count=1)

        clean_videos.append(vid)
        total_views += vid["views"]
        total_engagement += (
            vid["stats"]["diggCount"] +
            vid["stats"]["commentCount"] +
            vid["stats"]["shareCount"]
        )

    # Calculate metrics
    avg_views = total_views / len(clean_videos) if clean_videos else 0
    engagement_rate = (total_engagement / total_views * 100) if total_views > 0 else 0

    # Get profile info from first video
    first_vid = clean_videos[0]
    author_info = first_vid["author"]

    # Create competitor record
    competitor = Competitor(
        user_id=current_user.id,  # Proper FK relationship
        username=clean_username,
        display_name=author_info["username"],
        avatar_url=author_info["avatar"],
        bio="",
        followers_count=author_info["followers"],
        total_videos=len(clean_videos),
        avg_views=avg_views,
        engagement_rate=round(engagement_rate, 2),
        posting_frequency=0.0,
        recent_videos=clean_videos,
        top_hashtags=[],
        content_categories={},
        is_active=True,
        last_analyzed_at=datetime.utcnow(),
        notes=data.notes,
        tags=data.tags or []
    )

    db.add(competitor)
    db.commit()
    db.refresh(competitor)

    logger.info(f"✅ User {current_user.id} added competitor @{clean_username}")

    return CompetitorResponse.model_validate(competitor)


@router.get("/{username}", response_model=CompetitorResponse)
def get_competitor(
    username: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a tracked competitor.

    User Isolation: Only returns if competitor belongs to authenticated user.
    """
    clean_username = username.lower().strip().replace("@", "")

    competitor = db.query(Competitor).filter(
        Competitor.user_id == current_user.id,
        Competitor.username == clean_username
    ).first()

    if not competitor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Competitor @{clean_username} not found in your tracking list"
        )

    return CompetitorResponse.model_validate(competitor)


@router.patch("/{username}", response_model=CompetitorResponse)
def update_competitor(
    username: str,
    data: CompetitorUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update competitor notes, tags, or status.

    User Isolation: Only updates if competitor belongs to authenticated user.
    """
    clean_username = username.lower().strip().replace("@", "")

    competitor = db.query(Competitor).filter(
        Competitor.user_id == current_user.id,
        Competitor.username == clean_username
    ).first()

    if not competitor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Competitor @{clean_username} not found"
        )

    # Update fields
    if data.notes is not None:
        competitor.notes = data.notes
    if data.tags is not None:
        competitor.tags = data.tags
    if data.is_active is not None:
        competitor.is_active = data.is_active

    competitor.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(competitor)

    logger.info(f"📝 User {current_user.id} updated competitor @{clean_username}")

    return CompetitorResponse.model_validate(competitor)


@router.delete("/{username}", status_code=status.HTTP_204_NO_CONTENT)
def delete_competitor(
    username: str,
    hard_delete: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove competitor from tracking.

    Default: Soft delete (sets is_active=False)
    hard_delete=True: Permanently removes the record

    User Isolation: Only deletes if competitor belongs to authenticated user.
    """
    clean_username = username.lower().strip().replace("@", "")

    competitor = db.query(Competitor).filter(
        Competitor.user_id == current_user.id,
        Competitor.username == clean_username
    ).first()

    if not competitor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Competitor @{clean_username} not found"
        )

    if hard_delete:
        db.delete(competitor)
        logger.info(f"🗑️ User {current_user.id} permanently deleted competitor @{clean_username}")
    else:
        competitor.is_active = False
        competitor.updated_at = datetime.utcnow()
        logger.info(f"🔴 User {current_user.id} deactivated competitor @{clean_username}")

    db.commit()


@router.put("/{username}/refresh", response_model=CompetitorResponse)
def refresh_competitor_data(
    username: str,
    current_user: User = Depends(check_rate_limit),
    db: Session = Depends(get_db)
):
    """
    Refresh competitor data by re-parsing their profile.

    User Isolation: Only refreshes if competitor belongs to authenticated user.
    """
    clean_username = username.lower().strip().replace("@", "")

    competitor = db.query(Competitor).filter(
        Competitor.user_id == current_user.id,
        Competitor.username == clean_username
    ).first()

    if not competitor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Competitor @{clean_username} not found"
        )

    logger.info(f"🔄 User {current_user.id} refreshing competitor: @{clean_username}")

    collector = TikTokCollector()
    raw_videos = collector.collect([clean_username], limit=30, mode="profile")

    if not raw_videos:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Failed to refresh @{clean_username} - profile not found"
        )

    # Process videos
    scorer = TrendScorer()
    clean_videos = []
    total_views = 0
    total_engagement = 0

    for raw in raw_videos:
        vid = normalize_video_data(raw)
        scorer_data = {
            "views": vid["views"],
            "author_followers": vid["author"]["followers"],
            "collect_count": 0,
            "share_count": vid["stats"]["shareCount"]
        }
        vid["uts_score"] = scorer.calculate_uts(scorer_data, history_data=None, cascade_count=1)
        clean_videos.append(vid)
        total_views += vid["views"]
        total_engagement += (
            vid["stats"]["diggCount"] +
            vid["stats"]["commentCount"] +
            vid["stats"]["shareCount"]
        )

    avg_views = total_views / len(clean_videos) if clean_videos else 0
    engagement_rate = (total_engagement / total_views * 100) if total_views > 0 else 0

    # Update competitor
    first_vid = clean_videos[0]
    competitor.followers_count = first_vid["author"]["followers"]
    competitor.avatar_url = first_vid["author"]["avatar"]
    competitor.total_videos = len(clean_videos)
    competitor.avg_views = avg_views
    competitor.engagement_rate = round(engagement_rate, 2)
    competitor.recent_videos = clean_videos
    competitor.last_analyzed_at = datetime.utcnow()
    competitor.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(competitor)

    logger.info(f"✅ User {current_user.id} refreshed competitor @{clean_username}")

    return CompetitorResponse.model_validate(competitor)


# =============================================================================
# SPY MODE
# =============================================================================

@router.get("/{username}/spy", response_model=SpyModeResponse)
def spy_competitor(
    username: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Spy Mode: Detailed competitor analysis with top videos and feed.

    User Isolation: Only returns data if competitor belongs to authenticated user.
    """
    clean_username = username.lower().strip().replace("@", "")

    # Try to find in user's competitors
    competitor = db.query(Competitor).filter(
        Competitor.user_id == current_user.id,
        Competitor.username == clean_username
    ).first()

    if not competitor or not competitor.recent_videos:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Competitor @{clean_username} not found. Add them first using POST /api/competitors/"
        )

    clean_feed = competitor.recent_videos
    channel_data = ChannelData(
        nickName=competitor.display_name or competitor.username,
        uniqueId=competitor.username,
        avatarThumb=competitor.avatar_url,
        fans=competitor.followers_count,
        videos=competitor.total_videos,
        likes=competitor.total_likes,
        following=competitor.following_count
    )

    # Sort videos
    top_videos = sorted(clean_feed, key=lambda x: x.get("views", 0), reverse=True)[:3]
    latest_videos = sorted(clean_feed, key=lambda x: x.get("uploaded_at", 0), reverse=True)

    # Convert to response format
    def convert_video(vid: dict) -> CompetitorVideo:
        return CompetitorVideo(
            id=vid.get("id", ""),
            title=vid.get("title", ""),
            url=vid.get("url", ""),
            cover_url=vid.get("cover_url"),
            uploaded_at=vid.get("uploaded_at"),
            views=vid.get("views", 0),
            stats=CompetitorVideoStats(**vid.get("stats", {})),
            uts_score=vid.get("uts_score", 0.0)
        )

    return SpyModeResponse(
        username=clean_username,
        channel_data=channel_data,
        top_3_hits=[convert_video(v) for v in top_videos],
        latest_feed=[convert_video(v) for v in latest_videos],
        metrics=CompetitorMetrics(
            avg_views=int(competitor.avg_views),
            engagement_rate=competitor.engagement_rate,
            posting_frequency=competitor.posting_frequency
        ),
        hashtag_analysis=None,  # Can be implemented later
        content_categories=competitor.content_categories,
        last_analyzed_at=competitor.last_analyzed_at
    )
