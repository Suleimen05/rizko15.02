# backend/app/api/trends.py
"""
Trend Search & Analysis API.

Enterprise-grade endpoints with:
- User data isolation (each user sees only their data)
- Rate limiting based on subscription tier
- Proper authentication via JWT
- Input validation and sanitization
"""
import time
import logging
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, delete

from ..core.database import get_db
from ..db.models import Trend, User, UserSearch, SearchMode as DBSearchMode
from ..services.collector import TikTokCollector
from ..services.scorer import TrendScorer
from ..services.ml_client import get_ml_client
from ..services.clustering import cluster_trends_by_visuals
from ..services.scheduler import scheduler, rescan_videos_task

from .dependencies import (
    get_current_user,
    get_current_user_optional,
    check_rate_limit,
    check_deep_analyze_limit,
    rate_limiter
)
from .schemas.trends import (
    SearchRequest,
    SearchResponseLight,
    SearchResponseDeep,
    TrendLight,
    TrendDeep,
    SavedTrendResponse,
    TrendListResponse,
    VideoStats,
    AuthorInfo,
    MusicInfo,
    VideoInfo,
    HashtagInfo,
    UTSBreakdown,
    ClusterInfo,
    SearchMode
)

# Logger setup
logger = logging.getLogger(__name__)

router = APIRouter()


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def trend_to_dict(trend: Trend) -> dict:
    """Convert Trend model to dictionary."""
    return {
        "id": trend.platform_id,  # platform_id for frontend video display
        "trend_id": trend.id,  # Database ID for favorites
        "platform_id": trend.platform_id,
        "url": trend.url,
        "cover_url": trend.cover_url,
        "description": trend.description,
        "author_username": trend.author_username,
        "stats": trend.stats,
        "initial_stats": trend.initial_stats,
        "uts_score": trend.uts_score,
        "cluster_id": trend.cluster_id,
        "music_id": trend.music_id,
        "music_title": trend.music_title,
        "last_scanned_at": trend.last_scanned_at
    }


def parse_video_data(item: dict, idx: int = 0) -> dict:
    """
    Parse raw video data from Apify into standardized format.

    Handles various response structures from TikTok scraper.
    """
    v_meta = item.get("video") or item.get("videoMeta") or {}
    author_meta = item.get("author") or item.get("authorMeta") or item.get("channel") or {}

    # Cover URL
    cover_url = ""
    if v_meta:
        cover_url = v_meta.get("cover") or v_meta.get("coverUrl") or v_meta.get("dynamicCover") or ""
    if not cover_url:
        cover_url = item.get("coverUrl") or item.get("cover") or item.get("videoCover") or ""
    cover_url = cover_url.replace(".heic", ".jpeg").replace(".webp", ".jpeg") if cover_url else ""

    # Video URL
    video_url = (
        item.get("webVideoUrl") or
        item.get("postPage") or
        item.get("url") or
        item.get("videoUrl") or
        f"https://www.tiktok.com/@{author_meta.get('uniqueId', 'user')}/video/{item.get('id', '')}"
    )

    # Play address
    play_addr = (
        v_meta.get("playAddr") or
        v_meta.get("downloadAddr") or
        item.get("videoUrl") or
        item.get("playAddr") or
        ""
    )

    # Description
    description = (
        item.get("text") or
        item.get("desc") or
        item.get("title") or
        item.get("description") or
        "No description"
    )

    # Username
    username = (
        author_meta.get("uniqueId") or
        author_meta.get("username") or
        item.get("authorName") or
        "unknown"
    )

    # Stats
    stats = item.get("stats") or {}
    play_count = item.get("views") or stats.get("playCount") or stats.get("views") or item.get("playCount") or 0
    digg_count = item.get("likes") or stats.get("diggCount") or stats.get("likes") or 0
    comment_count = item.get("comments") or stats.get("commentCount") or stats.get("comments") or 0
    share_count = item.get("shares") or stats.get("shareCount") or stats.get("shares") or 0

    # Hashtags
    hashtags = item.get("hashtags") or item.get("challenges") or []
    hashtags_list = []
    if isinstance(hashtags, list):
        for tag in hashtags[:5]:
            if isinstance(tag, dict):
                hashtags_list.append({
                    "id": tag.get("id") or tag.get("name", ""),
                    "name": tag.get("title") or tag.get("name", ""),
                    "title": tag.get("title") or tag.get("name", ""),
                    "desc": tag.get("desc", ""),
                    "stats": {"videoCount": 0, "viewCount": 0}
                })

    # Music info
    music_meta = item.get("music") or item.get("musicMeta") or {}
    music_info = None
    if music_meta:
        music_info = {
            "id": str(music_meta.get("id", "")),
            "title": music_meta.get("title") or music_meta.get("name", "Original Sound"),
            "authorName": music_meta.get("authorName") or music_meta.get("author", username),
            "original": music_meta.get("original", False),
            "playUrl": music_meta.get("playUrl", "")
        }

    # Duration
    duration = v_meta.get("duration") or item.get("duration") or 15000

    # Author info
    author_info = {
        "id": str(author_meta.get("id", "")),
        "uniqueId": username,
        "nickname": author_meta.get("nickname") or author_meta.get("name") or username,
        "avatar": author_meta.get("avatarThumb") or author_meta.get("avatar", ""),
        "followerCount": author_meta.get("fans") or author_meta.get("followers", 0),
        "followingCount": author_meta.get("following", 0),
        "heartCount": author_meta.get("heart", 0),
        "videoCount": author_meta.get("video") or author_meta.get("videos", 0),
        "verified": author_meta.get("verified", False)
    }

    return {
        "id": str(item.get("id", "")),
        "title": description,
        "description": description,
        "url": video_url,
        "cover_url": cover_url,
        "author_username": username,
        "play_addr": play_addr,
        "author": author_info,
        "stats": {
            "playCount": int(play_count),
            "diggCount": int(digg_count),
            "commentCount": int(comment_count),
            "shareCount": int(share_count)
        },
        "video": {
            "duration": int(duration),
            "ratio": "9:16",
            "cover": cover_url,
            "playAddr": play_addr,
            "downloadAddr": play_addr
        },
        "music": music_info,
        "hashtags": hashtags_list,
        "createdAt": item.get("createTime") or item.get("createTimeISO", ""),
        "raw_item": item  # Keep raw for deep analyze
    }


def log_search(
    db: Session,
    user_id: int,
    query: str,
    mode: str,
    is_deep: bool,
    results_count: int,
    execution_time_ms: int
) -> None:
    """Log search to user's history."""
    try:
        search_record = UserSearch(
            user_id=user_id,
            query=query,
            mode=DBSearchMode.USERNAME if mode == "username" else DBSearchMode.KEYWORDS,
            is_deep=is_deep,
            results_count=results_count,
            execution_time_ms=execution_time_ms
        )
        db.add(search_record)
        db.commit()
    except Exception as e:
        logger.warning(f"Failed to log search: {e}")
        db.rollback()


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.get("/results")
def get_saved_results(
    keyword: str,
    mode: str = "keywords",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's saved search results from database.

    User Isolation: Only returns trends belonging to the authenticated user.
    Self-cleaning: Removes trends after reading if rescan completed.
    """
    logger.info(f"📂 DB Buffer Read: user={current_user.id}, query='{keyword}', mode='{mode}'")

    clean_nick = keyword.lower().strip().replace("@", "")

    # Build query with USER ISOLATION
    base_query = db.query(Trend).filter(Trend.user_id == current_user.id)

    if mode == "username":
        query = base_query.filter(Trend.author_username.ilike(clean_nick))
    else:
        search_term = f"%{keyword}%"
        query = base_query.filter(
            or_(
                Trend.description.ilike(search_term),
                Trend.vertical.ilike(search_term)
            )
        )

    results = query.order_by(Trend.uts_score.desc()).all()
    data_to_return = [trend_to_dict(t) for t in results]

    # Self-cleaning: Remove completed scans
    ids_to_clean = [t.id for t in results if t.last_scanned_at is not None]

    if ids_to_clean:
        # Only delete user's own trends
        db.execute(
            delete(Trend).where(
                Trend.id.in_(ids_to_clean),
                Trend.user_id == current_user.id
            )
        )
        db.commit()
        logger.info(f"🧹 Cleaned {len(ids_to_clean)} temporary records for user {current_user.id}")

    return {"status": "ok", "items": data_to_return}


@router.get("/my-trends", response_model=TrendListResponse)
def get_my_trends(
    page: int = 1,
    per_page: int = 20,
    vertical: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get paginated list of user's saved trends.

    User Isolation: Only returns trends belonging to the authenticated user.
    """
    query = db.query(Trend).filter(Trend.user_id == current_user.id)

    if vertical:
        query = query.filter(Trend.vertical.ilike(f"%{vertical}%"))

    total = query.count()
    offset = (page - 1) * per_page

    trends = query.order_by(Trend.created_at.desc()).offset(offset).limit(per_page).all()

    items = [
        SavedTrendResponse(
            id=t.id,
            user_id=t.user_id,
            platform_id=t.platform_id,
            url=t.url,
            description=t.description,
            cover_url=t.cover_url,
            author_username=t.author_username,
            stats=t.stats or {},
            uts_score=t.uts_score or 0.0,
            vertical=t.vertical,
            created_at=t.created_at
        )
        for t in trends
    ]

    return TrendListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        has_more=(offset + len(trends)) < total
    )


@router.post("/search")
def search_trends(
    req: SearchRequest,
    current_user: User = Depends(check_rate_limit),
    db: Session = Depends(get_db)
):
    """
    Unified Search Endpoint with Light/Deep Analyze modes.

    Light Analyze (FREE/CREATOR): Basic metrics, fast results
    Deep Analyze (PRO/AGENCY): 6-layer UTS, clustering, velocity, saturation

    User Isolation: All saved trends are tagged with user_id.
    Rate Limited: Based on subscription tier.
    """
    start_time = time.time()

    try:
        search_targets = [req.target] if req.target else req.keywords
        if not search_targets or not search_targets[0]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No query provided"
            )
    except Exception as e:
        logger.error(f"Error parsing request: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid request: {str(e)}"
        )

    # Deep Analyze tier check
    if req.is_deep:
        # Check tier and daily limits
        rate_limiter.check_deep_analyze_limit(
            current_user.id,
            current_user.subscription_tier
        )

    logger.info(
        f"🔎 Search [{req.mode.value}]: {search_targets} "
        f"(Mode: {'DEEP' if req.is_deep else 'LIGHT'}, "
        f"User: {current_user.id}, Tier: {current_user.subscription_tier.value})"
    )

    collector = TikTokCollector()
    raw_items = []
    clean_items = []

    # ==========================================================================
    # LIGHT ANALYZE: Check cache first
    # ==========================================================================
    if not req.is_deep and req.mode != SearchMode.USERNAME:
        limit = 20
        try:
            # Check cache in database (USER ISOLATED)
            clean_nick = search_targets[0].lower().strip().replace("@", "")
            search_term = f"%{clean_nick}%"
            cached_results = db.query(Trend).filter(
                Trend.user_id == current_user.id,  # USER ISOLATION
                or_(
                    Trend.description.ilike(search_term),
                    Trend.vertical.ilike(search_term)
                )
            ).order_by(Trend.uts_score.desc()).limit(limit).all()
        except Exception as e:
            logger.error(f"Error querying cache: {e}")
            cached_results = []

        # Use fresh cache (< 1 hour)
        if cached_results:
            recent_cached = [
                t for t in cached_results
                if not t.last_scanned_at or
                (datetime.utcnow() - t.last_scanned_at) < timedelta(hours=1)
            ]
            if recent_cached:
                execution_time = int((time.time() - start_time) * 1000)
                log_search(db, current_user.id, search_targets[0], req.mode.value, False, len(recent_cached), execution_time)
                logger.info(f"💾 [LIGHT] Using cache ({len(recent_cached)} items)")
                return {"status": "ok", "mode": "light", "items": [trend_to_dict(t) for t in recent_cached]}

        # No cache - fetch from Apify
        logger.info(f"🔄 [LIGHT] No cache, fetching from Apify...")
        raw_items = collector.collect(search_targets, limit=limit, mode="search", is_deep=False)

        if not raw_items:
            execution_time = int((time.time() - start_time) * 1000)
            log_search(db, current_user.id, search_targets[0], req.mode.value, False, 0, execution_time)
            return {"status": "empty", "items": []}

        # Filter by minimum views
        for item in raw_items:
            v_count = int(item.get("views") or (item.get("stats") or {}).get("playCount") or 0)
            if v_count >= 5000:
                clean_items.append(item)

    # ==========================================================================
    # USERNAME MODE or DEEP ANALYZE
    # ==========================================================================
    elif req.mode == SearchMode.USERNAME:
        limit = 20
        logger.info(f"🔍 Parsing user profile '{search_targets[0]}'...")
        raw_items = collector.collect(search_targets, limit=limit, mode="profile", is_deep=True)
        if not raw_items:
            execution_time = int((time.time() - start_time) * 1000)
            log_search(db, current_user.id, search_targets[0], req.mode.value, False, 0, execution_time)
            return {"status": "empty", "items": []}
        clean_items = raw_items

    elif req.is_deep:
        limit = 50
        logger.info(f"🔬 [DEEP] Full analysis for '{search_targets[0]}'...")
        raw_items = collector.collect(search_targets, limit=limit, mode="search", is_deep=req.is_deep)
        if not raw_items:
            execution_time = int((time.time() - start_time) * 1000)
            log_search(db, current_user.id, search_targets[0], req.mode.value, True, 0, execution_time)
            return {"status": "empty", "items": []}

        for item in raw_items:
            v_count = int(item.get("views") or (item.get("stats") or {}).get("playCount") or 0)
            if v_count >= 5000:
                clean_items.append(item)

    # ==========================================================================
    # LIGHT ANALYZE RESPONSE
    # ==========================================================================
    if not req.is_deep:
        live_results = []
        for idx, item in enumerate(clean_items):
            parsed = parse_video_data(item, idx)

            # Simple viral score
            stats = parsed["stats"]
            play_count = stats["playCount"]
            engagement_rate = round(
                (stats["diggCount"] + stats["commentCount"] + stats["shareCount"]) /
                max(play_count, 1) * 100, 2
            ) if play_count > 0 else 0
            simple_viral_score = min(engagement_rate * 10, 100)

            live_results.append({
                "id": parsed["id"],
                "title": parsed["title"],
                "description": parsed["description"],
                "url": parsed["url"],
                "cover_url": parsed["cover_url"],
                "author_username": parsed["author_username"],
                "play_addr": parsed["play_addr"],
                "author": parsed["author"],
                "stats": parsed["stats"],
                "video": parsed["video"],
                "music": parsed["music"],
                "hashtags": parsed["hashtags"],
                "createdAt": parsed["createdAt"],
                "viralScore": round(simple_viral_score, 1),
                "engagementRate": engagement_rate
            })

        execution_time = int((time.time() - start_time) * 1000)
        log_search(db, current_user.id, search_targets[0], req.mode.value, False, len(live_results), execution_time)

        if live_results:
            logger.info(f"✅ [LIGHT] Parsed {len(live_results)} items")

        return {
            "status": "ok",
            "mode": "light",
            "items": live_results
        }

    # ==========================================================================
    # DEEP ANALYZE PROCESSING
    # ==========================================================================
    scorer = TrendScorer()
    processed_trends = []
    cascade_total = len(clean_items)

    # Build cascade map
    music_cascade_map = {}
    for item in clean_items:
        music_id = (item.get("music") or {}).get("id") or (item.get("musicMeta") or {}).get("id")
        if music_id:
            music_cascade_map[str(music_id)] = music_cascade_map.get(str(music_id), 0) + 1

    for item in clean_items:
        parsed = parse_video_data(item)
        p_id = parsed["id"]
        video_url = parsed["url"]
        stats = parsed["stats"]
        views_now = stats["playCount"]

        author_meta = item.get("author") or item.get("authorMeta") or item.get("channel") or {}
        followers = author_meta.get("fans") or author_meta.get("followers") or 1

        likes = stats["diggCount"]
        comments = stats["commentCount"]
        shares = stats["shareCount"]
        bookmarks = item.get("bookmarks") or (item.get("stats") or {}).get("collectCount") or 0

        music_id = (item.get("music") or item.get("song") or {}).get("id") or (item.get("musicMeta") or {}).get("id")
        cascade_count = music_cascade_map.get(str(music_id), 1) if music_id else 1

        current_stats = {
            "playCount": views_now,
            "diggCount": likes,
            "commentCount": comments,
            "shareCount": shares
        }

        # Check if video exists for this user
        existing = db.query(Trend).filter(
            Trend.user_id == current_user.id,  # USER ISOLATION
            or_(Trend.platform_id == p_id, Trend.url == video_url)
        ).first()

        try:
            uts_data = {
                'views': int(views_now or 0),
                'author_followers': int(followers or 1),
                'collect_count': int(bookmarks or 0),
                'share_count': int(shares or 0),
                'likes': int(likes or 0),
                'comments': int(comments or 0)
            }

            history_data = None
            if existing and existing.initial_stats:
                history_data = {
                    'play_count': existing.initial_stats.get('playCount', views_now)
                }

            uts_breakdown = scorer.calculate_uts_breakdown(uts_data, history_data, cascade_count)

            if existing:
                existing.initial_stats = current_stats
                existing.stats = current_stats
                existing.uts_score = uts_breakdown['final_score']
                existing.last_scanned_at = None
                existing.is_deep_scan = True
                db.add(existing)
                processed_trends.append(existing)
            else:
                new_trend = Trend(
                    user_id=current_user.id,  # USER ISOLATION
                    platform_id=p_id,
                    url=video_url,
                    cover_url=parsed["cover_url"],
                    description=parsed["description"],
                    stats=current_stats,
                    initial_stats=current_stats,
                    author_username=parsed["author_username"],
                    author_followers=followers,
                    uts_score=uts_breakdown['final_score'],
                    vertical=search_targets[0] or "deep_scan",
                    music_id=str(music_id) if music_id else None,
                    music_title=(item.get("music") or {}).get("title"),
                    search_query=search_targets[0],
                    search_mode=DBSearchMode.USERNAME if req.mode == SearchMode.USERNAME else DBSearchMode.KEYWORDS,
                    is_deep_scan=True,
                    last_scanned_at=None
                )
                db.add(new_trend)
                processed_trends.append(new_trend)
            db.commit()

        except Exception as e:
            logger.error(f"Error processing video {p_id}: {e}")
            db.rollback()

    # Clustering
    if req.is_deep and processed_trends:
        logger.info(f"🧩 Clustering {len(processed_trends)} videos...")
        processed_trends = cluster_trends_by_visuals(processed_trends)
        for t in processed_trends:
            db.add(t)
        try:
            db.commit()
        except:
            db.rollback()

    # Schedule rescan
    if req.is_deep and processed_trends:
        saved_urls = [t.url for t in processed_trends if t.url]
        if saved_urls:
            run_date = datetime.now() + timedelta(hours=req.rescan_hours)
            scheduler.add_job(
                rescan_videos_task, 'date',
                run_date=run_date,
                args=[saved_urls, f"batch_{int(time.time())}_{current_user.id}"]
            )
            logger.info(f"⏱️ Rescan scheduled in {req.rescan_hours}h for user {current_user.id}")

    # Build deep response
    deep_results = []
    for trend in processed_trends:
        uts_data = {
            'views': trend.stats.get('playCount', 0),
            'author_followers': trend.author_followers or 1,
            'collect_count': trend.stats.get('collectCount', 0) or trend.stats.get('saveCount', 0),
            'share_count': trend.stats.get('shareCount', 0),
            'likes': trend.stats.get('diggCount', 0),
            'comments': trend.stats.get('commentCount', 0)
        }
        history_data = None
        if trend.initial_stats:
            history_data = {'play_count': trend.initial_stats.get('playCount', 0)}

        music_id_str = str(trend.music_id) if trend.music_id else None
        cascade_count = music_cascade_map.get(music_id_str, 1) if music_id_str else 1

        uts_breakdown = scorer.calculate_uts_breakdown(uts_data, history_data, cascade_count)

        deep_results.append({
            **trend_to_dict(trend),
            'uts_breakdown': {
                'l1_viral_lift': uts_breakdown['l1_viral_lift'],
                'l2_velocity': uts_breakdown['l2_velocity'],
                'l3_retention': uts_breakdown['l3_retention'],
                'l4_cascade': uts_breakdown['l4_cascade'],
                'l5_saturation': uts_breakdown['l5_saturation'],
                'l7_stability': uts_breakdown['l7_stability'],
                'final_score': uts_breakdown['final_score']
            },
            'saturation_score': uts_breakdown['l5_saturation'],
            'cascade_count': cascade_count,
            'cascade_score': uts_breakdown['l4_cascade'],
            'velocity_score': uts_breakdown['l2_velocity']
        })

    # Build clusters info
    clusters_info = {}
    for trend in processed_trends:
        if trend.cluster_id is not None and trend.cluster_id >= 0:
            if trend.cluster_id not in clusters_info:
                clusters_info[trend.cluster_id] = {
                    'cluster_id': trend.cluster_id,
                    'video_count': 0,
                    'total_uts': 0,
                    'videos': []
                }
            clusters_info[trend.cluster_id]['video_count'] += 1
            clusters_info[trend.cluster_id]['total_uts'] += trend.uts_score
            clusters_info[trend.cluster_id]['videos'].append(trend.platform_id)

    clusters_list = [
        {
            'cluster_id': info['cluster_id'],
            'video_count': info['video_count'],
            'avg_uts': round(info['total_uts'] / info['video_count'], 2) if info['video_count'] > 0 else 0
        }
        for info in clusters_info.values()
    ]

    execution_time = int((time.time() - start_time) * 1000)
    log_search(db, current_user.id, search_targets[0], req.mode.value, True, len(deep_results), execution_time)

    logger.info(f"✅ [DEEP] Processed {len(deep_results)} items. Clusters: {len(clusters_list)}")

    return {
        "status": "ok",
        "mode": "deep",
        "items": deep_results,
        "clusters": clusters_list
    }


@router.delete("/clear")
def clear_user_trends(
    vertical: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Clear user's saved trends.

    User Isolation: Only deletes trends belonging to the authenticated user.
    """
    query = db.query(Trend).filter(Trend.user_id == current_user.id)

    if vertical:
        query = query.filter(Trend.vertical.ilike(f"%{vertical}%"))

    deleted_count = query.delete(synchronize_session=False)
    db.commit()

    logger.info(f"🗑️ Cleared {deleted_count} trends for user {current_user.id}")

    return {
        "status": "ok",
        "deleted_count": deleted_count
    }


@router.get("/limits")
def get_user_limits(
    current_user: User = Depends(get_current_user)
):
    """Get user's current rate limits and usage."""
    limits = rate_limiter.get_remaining_limits(
        current_user.id,
        current_user.subscription_tier
    )

    return {
        "user_id": current_user.id,
        "tier": current_user.subscription_tier.value,
        "credits": current_user.credits,
        **limits
    }
