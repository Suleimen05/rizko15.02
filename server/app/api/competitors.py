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
from ..services.instagram_collector import InstagramCollector
from ..services.instagram_profile_adapter import adapt_instagram_profile_to_posts
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
    CompetitorVideoStats,
    CompetitorFeedResponse,
    CompetitorFeedProfile,
    CompetitorFeedVideo
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
    # Try multiple fallbacks for cover image
    cover = fix_tt_url(
        video_obj.get("cover") or
        video_obj.get("coverUrl") or
        video_obj.get("dynamicCover") or
        video_obj.get("originCover") or
        item.get("cover_url") or
        item.get("coverUrl") or
        item.get("videoCover") or
        item.get("cover")
    )

    # Extract video URL for playback (video.url is the main field)
    video_url = fix_tt_url(
        video_obj.get("url") or
        video_obj.get("playAddr") or
        video_obj.get("downloadAddr") or
        item.get("video_url") or
        item.get("videoUrl")
    )

    # DEBUG: Print cover extraction
    if not cover:
        print(f"⚠️ WARNING: No cover found for video {item.get('id')}")
        print(f"  - video_obj keys: {list(video_obj.keys())[:10] if video_obj else 'empty'}")
        print(f"  - video.cover: {video_obj.get('cover', 'missing')[:50] if video_obj.get('cover') else 'null'}")

    # Upload thumbnail to Supabase Storage (images only, not videos)
    cover_url_final = cover
    if cover:
        uploaded_cover = SupabaseStorage.upload_thumbnail(cover)
        if uploaded_cover:
            cover_url_final = uploaded_cover
        else:
            logger.warning(f"Failed to upload thumbnail for video {item.get('id')}, using original URL")

    return {
        "id": str(item.get("id")),
        "title": item.get("title") or item.get("desc") or "",
        "url": item.get("postPage") or item.get("webVideoUrl") or item.get("url"),
        "cover_url": cover_url_final,
        "video_url": video_url,
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
    platform: str = "tiktok",
    current_user: User = Depends(check_rate_limit)
):
    """
    Search for a channel by username (TikTok or Instagram).

    Returns basic profile info for preview before adding.
    No database storage - just live search.

    Args:
        username: Channel username (with or without @)
        platform: "tiktok" or "instagram"
    """
    clean_username = username.lower().strip().replace("@", "")

    logger.info(f"🔍 User {current_user.id} searching {platform} channel: @{clean_username}")

    if platform == "instagram":
        # Instagram search using profile scraper
        collector = InstagramCollector()
        raw_profiles = collector.collect([clean_username], limit=10, mode="profile")

        if not raw_profiles:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Instagram profile @{clean_username} not found"
            )

        # Extract profile data (instagram-profile-scraper returns profile object)
        profile = raw_profiles[0]

        return ChannelSearchResult(
            username=profile.get("username", clean_username),
            nickname=profile.get("fullName", clean_username),
            avatar=profile.get("profilePicUrl", ""),
            follower_count=profile.get("followersCount", 0),
            video_count=len(profile.get("latestPosts", [])),
            platform="instagram"
        )
    else:
        # TikTok search (existing logic)
        collector = TikTokCollector()
        raw_videos = collector.collect([clean_username], limit=5, mode="profile")

        if not raw_videos:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"TikTok channel @{clean_username} not found"
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
            platform=c.platform,
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

        # Use original CDN URL - frontend will proxy it automatically

        # Create competitor with minimal data (no videos yet)
        competitor = Competitor(
            user_id=current_user.id,
            platform=data.platform,
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
    logger.info(f"📡 Fetching @{clean_username} from {data.platform} Apify (no cached data)")

    if data.platform == "instagram":
        # Instagram flow
        collector = InstagramCollector()
        raw_profiles = collector.collect([clean_username], limit=30, mode="profile")

        if not raw_profiles:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Instagram profile @{clean_username} not found"
            )

        # Extract profile and convert posts
        profile = raw_profiles[0]
        raw_videos = adapt_instagram_profile_to_posts(profile)

        if not raw_videos:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Instagram profile @{clean_username} has no videos"
            )
    else:
        # TikTok flow
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

    # Use original CDN URL - frontend will proxy it automatically
    avatar_url = author_info["avatar"]

    # Create competitor record
    competitor = Competitor(
        user_id=current_user.id,  # Proper FK relationship
        platform=data.platform,
        username=clean_username,
        display_name=author_info["username"],
        avatar_url=avatar_url,
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


# =============================================================================
# COMPETITOR FEED (NEW!)
# =============================================================================

@router.get("/{username}/feed", response_model=CompetitorFeedResponse)
def get_competitor_feed(
    username: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get competitor's full feed with recent videos.
    
    Returns:
    - Profile data (username, avatar, followers, etc.)
    - Recent videos (with is_new flag for last 24h)
    
    User Isolation: Only returns data if competitor belongs to authenticated user.
    """
    clean_username = username.lower().strip().replace("@", "")
    
    # Get competitor from database
    competitor = db.query(Competitor).filter(
        Competitor.user_id == current_user.id,
        Competitor.username == clean_username
    ).first()
    
    if not competitor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Competitor @{clean_username} not found in your tracking list"
        )
    
    logger.info(f"📊 User {current_user.id} viewing feed for @{clean_username}")

    # ALWAYS fetch fresh data because TikTok URLs expire quickly (signature becomes invalid)
    # Even URLs that are only 20 minutes old return 403 failure-bad-signature
    from datetime import datetime, timedelta
    from app.services.collector import TikTokCollector

    should_refresh = False
    if competitor.last_analyzed_at:
        minutes_since_check = (datetime.utcnow() - competitor.last_analyzed_at).total_seconds() / 60
        # Refresh if data is older than 5 minutes (TikTok CDN signatures expire quickly)
        if minutes_since_check > 5:
            logger.warning(f"⚠️ Competitor @{clean_username} data is {minutes_since_check:.1f} minutes old - fetching fresh data")
            should_refresh = True
    else:
        should_refresh = True

    # Fetch fresh data synchronously so we return valid URLs
    if should_refresh:
        try:
            from app.services.trend_scorer import TrendScorer
            from app.api.utils import normalize_video_data

            collector = TikTokCollector()
            scorer = TrendScorer()

            logger.info(f"🔄 Fetching fresh data from Apify for @{clean_username}...")
            raw_videos = collector.collect([clean_username], limit=30, mode="profile")

            if raw_videos:
                # Process and update competitor data
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
                    total_engagement += vid["stats"]["diggCount"] + vid["stats"]["commentCount"]

                # Update competitor in database
                if clean_videos:
                    author_info = clean_videos[0]["author"]
                    avg_views = total_views / len(clean_videos) if clean_videos else 0
                    engagement_rate = (total_engagement / total_views * 100) if total_views > 0 else 0

                    competitor.display_name = author_info.get("username", clean_username)
                    competitor.avatar_url = author_info.get("avatar", competitor.avatar_url)
                    competitor.bio = author_info.get("bio", "")
                    competitor.followers_count = author_info.get("followers", 0)
                    competitor.total_videos = len(clean_videos)
                    competitor.avg_views = avg_views
                    competitor.engagement_rate = engagement_rate
                    competitor.recent_videos = clean_videos
                    competitor.last_analyzed_at = datetime.utcnow()

                    db.commit()
                    db.refresh(competitor)
                    logger.info(f"✅ Fresh data fetched and updated for @{clean_username}: {len(clean_videos)} videos")
            else:
                logger.warning(f"No videos returned from Apify for @{clean_username}")
        except Exception as e:
            logger.error(f"Failed to fetch fresh data for @{clean_username}: {e}")
            # Continue with stale data as fallback

    # Build profile data
    profile = CompetitorFeedProfile(
        username=competitor.username,
        nickname=competitor.display_name or competitor.username,
        avatar_url=competitor.avatar_url,
        bio=competitor.bio or "",
        followers_count=competitor.followers_count,
        total_videos=competitor.total_videos,
        avg_views=competitor.avg_views,
        engagement_rate=competitor.engagement_rate,
        created_at=competitor.created_at.isoformat(),
        last_checked_at=competitor.last_analyzed_at.isoformat() if competitor.last_analyzed_at else None
    )
    
    # Get videos from recent_videos field (JSONB)
    videos_data = competitor.recent_videos or []

    # DEBUG: Check what's in recent_videos
    logger.info(f"🔍 FEED DEBUG: recent_videos count = {len(videos_data)}")
    if videos_data:
        first = videos_data[0]
        logger.info(f"🔍 FEED DEBUG: First video keys = {list(first.keys())}")
        logger.info(f"🔍 FEED DEBUG: cover_url = {first.get('cover_url', 'MISSING')[:100] if first.get('cover_url') else 'None'}")

    # Calculate cutoff time for "new" videos (last 24 hours)
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    cutoff_time = now - timedelta(hours=24)
    
    # Build feed videos
    feed_videos = []
    for vid in videos_data[:20]:  # Limit to 20 most recent
        # Determine if video is "new" (posted in last 24h)
        uploaded_at = vid.get("uploaded_at", 0)
        is_new = False
        
        if uploaded_at and uploaded_at > 0:
            try:
                video_date = datetime.fromtimestamp(uploaded_at)
                is_new = video_date > cutoff_time
            except:
                is_new = False
        
        # Format video data
        cover_url_value = vid.get("cover_url")
        logger.info(f"🔍 FEED VIDEO DEBUG: id={vid.get('id', 'NO_ID')[:20]}, cover_url={cover_url_value[:100] if cover_url_value else 'None'}")

        feed_video = CompetitorFeedVideo(
            id=vid.get("id", ""),
            title=vid.get("title", ""),
            description=vid.get("title", ""),  # TikTok doesn't have separate description
            thumbnail_url=cover_url_value,
            video_url=vid.get("video_url"),  # Add video URL for playback
            url=vid.get("url", ""),
            stats=CompetitorVideoStats(
                playCount=vid.get("stats", {}).get("playCount", 0),
                diggCount=vid.get("stats", {}).get("diggCount", 0),
                commentCount=vid.get("stats", {}).get("commentCount", 0),
                shareCount=vid.get("stats", {}).get("shareCount", 0),
            ),
            posted_at=datetime.fromtimestamp(uploaded_at).isoformat() if uploaded_at > 0 else now.isoformat(),
            uts_score=vid.get("uts_score", 0.0),
            is_new=is_new
        )

        logger.info(f"🔍 FEED VIDEO OBJECT: thumbnail_url={feed_video.thumbnail_url[:100] if feed_video.thumbnail_url else 'None'}")
        feed_videos.append(feed_video)
    
    logger.info(f"✅ Returned {len(feed_videos)} videos for @{clean_username} ({sum(1 for v in feed_videos if v.is_new)} new)")

    response = CompetitorFeedResponse(
        profile=profile,
        videos=feed_videos
    )

    # DEBUG: Check final response
    logger.info(f"🔍 FINAL RESPONSE: profile.avatar_url={response.profile.avatar_url[:100] if response.profile.avatar_url else 'None'}")
    if response.videos:
        logger.info(f"🔍 FINAL RESPONSE: first video thumbnail_url={response.videos[0].thumbnail_url[:100] if response.videos[0].thumbnail_url else 'None'}")
        # Log the actual JSON dict to see what's being sent
        import json
        first_video_dict = response.videos[0].dict()
        logger.info(f"🔍 FINAL RESPONSE JSON: first video = {json.dumps(first_video_dict, indent=2)[:500]}")

        # Write to debug file
        with open("/tmp/competitor_feed_debug.json", "w") as f:
            json.dump({
                "profile": response.profile.dict(),
                "first_video": first_video_dict,
                "total_videos": len(response.videos)
            }, f, indent=2)
        logger.info("📝 Wrote debug info to /tmp/competitor_feed_debug.json")

    return response
