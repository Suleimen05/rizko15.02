from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from ..core.database import get_db
from ..db.models import Competitor, ProfileData
from ..services.collector import TikTokCollector
from ..services.scorer import TrendScorer

router = APIRouter()

# DEV MODE - для локальной разработки без auth
DEV_MODE = True
DEV_USER_ID = "dev-user-123"

def get_user_id(x_user_id: Optional[str] = Header(None)) -> str:
    """
    Получает user_id из заголовка или использует DEV user_id
    """
    if DEV_MODE:
        return x_user_id or DEV_USER_ID
    if not x_user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    return x_user_id

# --- PYDANTIC SCHEMAS ---
class CompetitorCreate(BaseModel):
    username: str
    notes: str = ""

class CompetitorResponse(BaseModel):
    id: int
    username: str
    display_name: str
    avatar_url: str
    bio: str
    followers_count: int
    total_videos: int
    avg_views: float
    engagement_rate: float
    posting_frequency: float
    is_active: bool
    created_at: datetime
    updated_at: datetime
    notes: str

    class Config:
        from_attributes = True


def fix_tt_url(url: str) -> str:
    if not url or not isinstance(url, str): return None
    if ".heic" in url: return url.replace(".heic", ".jpeg")
    return url

def normalize_video_data(item: dict) -> dict:
    """
    Превращает любой JSON от Apify в наш стандартный формат.
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


# --- API ENDPOINTS ---

class ChannelSearchResult(BaseModel):
    username: str
    nickname: str
    avatar: str
    follower_count: int
    video_count: int
    platform: str = "tiktok"

@router.get("/search/{username}")
def search_channel(username: str):
    """
    Поиск канала по username (без добавления в БД).
    Возвращает базовую информацию для превью.
    """
    clean_username = username.lower().strip().replace("@", "")
    
    print(f"🔍 Searching channel: @{clean_username}...")
    collector = TikTokCollector()
    raw_videos = collector.collect([clean_username], limit=5, mode="profile")
    
    if not raw_videos:
        raise HTTPException(status_code=404, detail=f"Channel @{clean_username} not found")
    
    # Берем данные из первого видео
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


@router.post("/", response_model=CompetitorResponse)
def add_competitor(
    data: CompetitorCreate, 
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    """
    Добавить нового конкурента для отслеживания.
    Автоматически парсит его профиль и собирает метрики.
    """
    clean_username = data.username.lower().strip().replace("@", "")

    # Проверяем, не добавлен ли уже этим пользователем
    existing = db.query(Competitor).filter(
        Competitor.user_id == user_id,
        Competitor.username == clean_username
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Competitor @{clean_username} already in your list")

    # Парсим профиль через TikTok Collector
    print(f"🔍 Adding competitor: @{clean_username}...")
    collector = TikTokCollector()
    raw_videos = collector.collect([clean_username], limit=30, mode="profile")

    if not raw_videos:
        raise HTTPException(status_code=404, detail=f"TikTok profile @{clean_username} not found")

    # Нормализуем данные
    scorer = TrendScorer()
    clean_videos = []
    total_views = 0
    total_engagement = 0
    hashtags_count = {}

    for raw in raw_videos:
        vid = normalize_video_data(raw)

        # Расчет UTS для каждого видео
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

    # Считаем метрики
    avg_views = total_views / len(clean_videos) if clean_videos else 0
    engagement_rate = (total_engagement / total_views * 100) if total_views > 0 else 0

    # Берем информацию о профиле из первого видео
    first_vid = clean_videos[0]
    author_info = first_vid["author"]

    # Создаем запись в БД
    competitor = Competitor(
        user_id=user_id,  # Добавляем user_id
        username=clean_username,
        display_name=author_info["username"],
        avatar_url=author_info["avatar"],
        bio="",  # TikTok API не всегда дает bio через Apify
        followers_count=author_info["followers"],
        total_videos=len(clean_videos),
        avg_views=avg_views,
        engagement_rate=round(engagement_rate, 2),
        posting_frequency=0.0,  # Можно рассчитать позже
        recent_videos=clean_videos,
        top_hashtags=[],
        content_categories={},
        is_active=True,
        last_analyzed_at=datetime.utcnow(),
        notes=data.notes
    )

    db.add(competitor)
    db.commit()
    db.refresh(competitor)

    print(f"✅ Competitor @{clean_username} added successfully!")
    return competitor


@router.get("/", response_model=List[CompetitorResponse])
def get_all_competitors(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    """
    Получить список всех отслеживаемых конкурентов текущего пользователя.
    """
    competitors = db.query(Competitor).filter(
        Competitor.user_id == user_id,
        Competitor.is_active == True
    ).all()
    return competitors


@router.get("/{username}", response_model=CompetitorResponse)
def get_competitor(
    username: str, 
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    """
    Получить детальную информацию о конкуренте.
    """
    clean_username = username.lower().strip().replace("@", "")
    competitor = db.query(Competitor).filter(
        Competitor.user_id == user_id,
        Competitor.username == clean_username
    ).first()

    if not competitor:
        raise HTTPException(status_code=404, detail=f"Competitor @{clean_username} not found")

    return competitor


@router.delete("/{username}")
def delete_competitor(
    username: str, 
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    """
    Удалить конкурента из отслеживания (soft delete - помечаем как неактивного).
    """
    clean_username = username.lower().strip().replace("@", "")
    competitor = db.query(Competitor).filter(
        Competitor.user_id == user_id,
        Competitor.username == clean_username
    ).first()

    if not competitor:
        raise HTTPException(status_code=404, detail=f"Competitor @{clean_username} not found")

    competitor.is_active = False
    db.commit()

    return {"message": f"Competitor @{clean_username} removed from tracking"}


@router.put("/{username}/refresh")
def refresh_competitor_data(
    username: str, 
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    """
    Обновить данные конкурента (перепарсить профиль).
    """
    clean_username = username.lower().strip().replace("@", "")
    competitor = db.query(Competitor).filter(
        Competitor.user_id == user_id,
        Competitor.username == clean_username
    ).first()

    if not competitor:
        raise HTTPException(status_code=404, detail=f"Competitor @{clean_username} not found")

    # Парсим заново
    print(f"🔄 Refreshing competitor data: @{clean_username}...")
    collector = TikTokCollector()
    raw_videos = collector.collect([clean_username], limit=30, mode="profile")

    if not raw_videos:
        raise HTTPException(status_code=404, detail=f"Failed to refresh @{clean_username}")

    # Обновляем метрики (аналогично добавлению)
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

    # Обновляем данные
    first_vid = clean_videos[0]
    competitor.followers_count = first_vid["author"]["followers"]
    competitor.total_videos = len(clean_videos)
    competitor.avg_views = avg_views
    competitor.engagement_rate = round(engagement_rate, 2)
    competitor.recent_videos = clean_videos
    competitor.last_analyzed_at = datetime.utcnow()

    db.commit()
    db.refresh(competitor)

    print(f"✅ Competitor @{clean_username} refreshed!")
    return competitor


@router.get("/{username}/spy")
def spy_competitor(
    username: str, 
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    """
    Spy Mode: Детальный анализ конкурента с топ видео и последней лентой.
    """
    clean_username = username.lower().strip().replace("@", "")

    # Пробуем найти в таблице Competitor
    competitor = db.query(Competitor).filter(
        Competitor.user_id == user_id,
        Competitor.username == clean_username
    ).first()

    if not competitor or not competitor.recent_videos:
        # Если нет в Competitor, пробуем ProfileData (legacy)
        profile = db.query(ProfileData).filter(ProfileData.username == clean_username).first()

        if not profile or not profile.recent_videos_data:
            raise HTTPException(
                status_code=404,
                detail=f"Competitor @{clean_username} not found. Add them first using POST /api/competitors/"
            )

        # Используем данные из ProfileData
        clean_feed = profile.recent_videos_data
        channel_data = profile.channel_data
        engagement_rate = profile.engagement_rate
        avg_views = profile.avg_views
    else:
        # Используем данные из Competitor
        clean_feed = competitor.recent_videos
        channel_data = {
            "nickName": competitor.display_name,
            "uniqueId": competitor.username,
            "avatarThumb": competitor.avatar_url,
            "fans": competitor.followers_count,
            "videos": competitor.total_videos
        }
        engagement_rate = competitor.engagement_rate
        avg_views = competitor.avg_views

    # Сортировка
    top_videos = sorted(clean_feed, key=lambda x: x.get("views", 0), reverse=True)[:3]
    latest_videos = sorted(clean_feed, key=lambda x: x.get("uploaded_at", 0), reverse=True)

    return {
        "username": clean_username,
        "channel_data": channel_data,
        "top_3_hits": top_videos,
        "latest_feed": latest_videos,
        "metrics": {
            "engagement_rate": engagement_rate,
            "avg_views": int(avg_views)
        }
    }
