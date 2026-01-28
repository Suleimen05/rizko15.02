# backend/app/api/trends.py
import time
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, delete # ✅ Добавлена функция удаления
from typing import List, Optional
from pydantic import BaseModel, Field

from ..core.database import get_db
from ..db.models import Trend
from ..services.collector import TikTokCollector
from ..services.scorer import TrendScorer
from ..services.ml_client import get_ml_client
from ..services.clustering import cluster_trends_by_visuals 

# ИМПОРТ ПЛАНИРОВЩИКА
from ..services.scheduler import scheduler, rescan_videos_task

router = APIRouter()

class SearchRequest(BaseModel):
    target: Optional[str] = None         # Основной ввод (ключ или @username)
    keywords: Optional[List[str]] = []   # Для обратной совместимости
    mode: str = "keywords"               # "keywords" или "username"
    business_desc: Optional[str] = ""
    is_deep: Optional[bool] = False      # Light (False) vs Deep (True) Analyze
    user_tier: str = Field(default="free")  # free, creator, pro, agency
    time_window: Optional[str] = None
    rescan_hours: int = Field(default=24, ge=1)

def trend_to_dict(trend: Trend) -> dict:
    return {
        "id": trend.id,
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

# --- ✅ ЭНДПОИНТ «ПРОЧИТАЛ И УДАЛИЛ» ---
@router.get("/results")
def get_saved_results(keyword: str, mode: str = "keywords", db: Session = Depends(get_db)):
    """
    Бесплатный поиск по базе данных. 
    Если данные уже прошли рескан (Точка Б), они удаляются сразу после выдачи.
    """
    print(f"📂 DB Buffer Read: ищем '{keyword}' в режиме '{mode}'")
    clean_nick = keyword.lower().strip().replace("@", "")
    
    if mode == "username":
        # СТРОГО: ищем видео, где этот юзер является автором
        query = db.query(Trend).filter(Trend.author_username.ilike(clean_nick))
    else:
        # ОБЫЧНЫЙ ПОИСК: по ключевым словам в разных полях
        search_term = f"%{keyword}%"
        query = db.query(Trend).filter(
            or_(Trend.description.ilike(search_term), Trend.vertical.ilike(search_term))
        )
    
    results = query.order_by(Trend.uts_score.desc()).all()
    data_to_return = [trend_to_dict(t) for t in results]

    # ✅ САМООЧИСТКА: Удаляем записи, если сверка уже завершена (есть дата последнего скана)
    ids_to_clean = [t.id for t in results if t.last_scanned_at is not None]
    
    if ids_to_clean:
        db.execute(delete(Trend).where(Trend.id.in_(ids_to_clean)))
        db.commit()
        print(f"🧹 БД Очищена: Удалено {len(ids_to_clean)} временных записей после выдачи.")

    return {"status": "ok", "items": data_to_return}

@router.post("/search")
def search_trends(req: SearchRequest, db: Session = Depends(get_db)):
    """
    Unified Search Endpoint with Light/Deep Analyze modes.
    
    Light Analyze (FREE/CREATOR): Basic metrics, fast results
    Deep Analyze (PRO/AGENCY): 6-layer UTS, clustering, velocity, saturation
    """
    try:
        search_targets = [req.target] if req.target else req.keywords
        if not search_targets or not search_targets[0]:
            return {"status": "error", "message": "No query provided"}
    except Exception as e:
        print(f"❌ Error parsing request: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid request: {str(e)}")
    
    # ✅ ПРОВЕРКА ДОСТУПА К DEEP ANALYZE
    if req.is_deep and req.user_tier not in ["pro", "agency"]:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "Deep Analyze requires Pro plan",
                "upgrade_url": "/pricing",
                "current_tier": req.user_tier,
                "required_tier": "pro",
                "features": [
                    "6-Layer UTS Score breakdown",
                    "Visual clustering (AI)",
                    "Growth velocity prediction",
                    "Saturation indicator",
                    "Sound cascade analysis",
                    "Auto-rescan (24h tracking)"
                ]
            }
        )

    print(f"🔎 API Search [{req.mode}]: {search_targets} (Mode: {'DEEP' if req.is_deep else 'LIGHT'}, Tier: {req.user_tier})")
    
    collector = TikTokCollector()
    raw_items = []
    clean_items = []
    
    # 1. Для Light Analyze - проверяем кэш (быстрые результаты)
    # Для Deep Analyze - ВСЕГДА пропускаем кэш (полный анализ)
    if not req.is_deep and req.mode != "username":
        limit = 20
        try:
            # Проверяем кэш в базе данных
            clean_nick = search_targets[0].lower().strip().replace("@", "")
            search_term = f"%{clean_nick}%"
            cached_results = db.query(Trend).filter(
                or_(Trend.description.ilike(search_term), Trend.vertical.ilike(search_term))
            ).order_by(Trend.uts_score.desc()).limit(limit).all()
        except Exception as e:
            print(f"❌ Error querying database cache: {e}")
            cached_results = []
        
        # Если есть свежие кэшированные данные (не старше 1 часа), используем их
        if cached_results:
            recent_cached = [t for t in cached_results 
                           if not t.last_scanned_at or 
                           (datetime.utcnow() - t.last_scanned_at) < timedelta(hours=1)]
            if recent_cached:
                print(f"💾 [LIGHT] Используем кэш ({len(recent_cached)} записей)")
                return {"status": "ok", "mode": "light", "items": [trend_to_dict(t) for t in recent_cached]}
        
        # Кэша нет - запускаем Apify
        print(f"🔄 [LIGHT] Кэш не найден, запускаем Apify...")
        raw_items = collector.collect(search_targets, limit=limit, mode="search", is_deep=False)
        
        if not raw_items:
            return {"status": "empty", "items": []}
        
        # Фильтруем результаты
        for item in raw_items:
            v_count = int(item.get("views") or (item.get("stats") or {}).get("playCount") or 0)
            if v_count >= 5000: clean_items.append(item)
    
    # 2. Для username или deep scan - всегда парсим
    elif req.mode == "username":
        limit = 20
        print(f"🔍 Парсинг профиля пользователя '{search_targets[0]}'...")
        raw_items = collector.collect(search_targets, limit=limit, mode="profile", is_deep=True)
        if not raw_items:
            return {"status": "empty", "items": []}
        clean_items = raw_items  # Для юзера берем всё без исключений
    
    elif req.is_deep:
        limit = 50
        print(f"🔬 [DEEP] Starting full analysis (no cache) для '{search_targets[0]}'...")
        # ВАЖНО: Для Deep Analyze ВСЕГДА делаем полный парсинг (игнорируем кэш)
        raw_items = collector.collect(search_targets, limit=limit, mode="search", is_deep=req.is_deep)
        if not raw_items:
            return {"status": "empty", "items": []}
        # Для ключевых слов оставляем популярные
        for item in raw_items:
            v_count = int(item.get("views") or (item.get("stats") or {}).get("playCount") or 0)
            if v_count >= 5000: clean_items.append(item)

    # --- ✅ РЕЖИМ 1: LIGHT ANALYZE (БЫСТРЫЙ ПОИСК БЕЗ ГЛУБОКОЙ МАТЕМАТИКИ) ---
    if not req.is_deep:
        # Light Analyze: только базовые метрики, как у конкурентов
        live_results = []
        for idx, item in enumerate(clean_items):
            # Пробуем разные варианты структуры данных от Apify
            v_meta = item.get("video") or item.get("videoMeta") or {}
            author_meta = item.get("author") or item.get("authorMeta") or item.get("channel") or {}
            
            # Debug: print first item structure
            if idx == 0:
                print(f"🔍 DEBUG: First item keys: {list(item.keys())}")
                print(f"🔍 DEBUG: video keys: {list(v_meta.keys()) if v_meta else 'EMPTY'}")
                print(f"🔍 DEBUG: channel/author keys: {list(author_meta.keys()) if author_meta else 'EMPTY'}")
                print(f"🔍 DEBUG: likes={item.get('likes')}, comments={item.get('comments')}, shares={item.get('shares')}")

            # Cover URL - TikTok scraper returns it in video.cover or video.dynamicCover
            cover_url = ""
            if v_meta:
                cover_url = v_meta.get("cover") or v_meta.get("coverUrl") or v_meta.get("dynamicCover") or ""
            if not cover_url:
                cover_url = item.get("coverUrl") or item.get("cover") or item.get("videoCover") or ""
            cover_url = cover_url.replace(".heic", ".jpeg").replace(".webp", ".jpeg") if cover_url else ""
            
            if idx == 0:
                print(f"🔍 DEBUG: cover_url = {cover_url[:80] if cover_url else 'EMPTY'}...")

            # URL видео
            video_url = (
                item.get("webVideoUrl") or
                item.get("postPage") or
                item.get("url") or
                item.get("videoUrl") or
                f"https://www.tiktok.com/@{author_meta.get('uniqueId', 'user')}/video/{item.get('id', '')}"
            )

            # Прямая ссылка на видео файл для воспроизведения
            play_addr = (
                v_meta.get("playAddr") or
                v_meta.get("downloadAddr") or
                item.get("videoUrl") or
                item.get("playAddr") or
                ""
            )

            # Описание
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

            # Stats - TikTok scraper returns them directly in item (views, likes, comments, shares)
            # NOT in item.stats!
            stats = item.get("stats") or {}
            
            play_count = (
                item.get("views") or  # Direct from Apify - PRIORITY
                stats.get("playCount") or
                stats.get("views") or
                item.get("playCount") or
                0
            )

            # Likes/comments/shares are DIRECTLY in item for Apify TikTok scraper
            digg_count = item.get("likes") or stats.get("diggCount") or stats.get("likes") or 0
            comment_count = item.get("comments") or stats.get("commentCount") or stats.get("comments") or 0
            share_count = item.get("shares") or stats.get("shareCount") or stats.get("shares") or 0

            # Hashtags
            hashtags = item.get("hashtags") or item.get("challenges") or []
            hashtags_list = []
            if isinstance(hashtags, list):
                for tag in hashtags[:5]:  # Limit to 5 hashtags
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

            # Video duration
            duration = v_meta.get("duration") or item.get("duration") or 15000  # default 15 seconds

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

            # Простой Viral Score для Light режима (без UTS математики)
            engagement_rate = round((int(digg_count) + int(comment_count) + int(share_count)) / max(int(play_count), 1) * 100, 2) if play_count > 0 else 0
            simple_viral_score = min(engagement_rate * 10, 100)  # 0-100 scale
            
            live_results.append({
                "id": str(item.get("id", "")),
                "title": description,
                "description": description,
                "url": video_url,
                "cover_url": cover_url,
                "author_username": username,
                "play_addr": play_addr,  # Прямая ссылка на видео
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
                # Light Analyze: простые метрики
                "viralScore": round(simple_viral_score, 1),
                "engagementRate": engagement_rate
                # НЕТ: uts_score, uts_breakdown, cluster_id, saturation_score, etc.
            })

        if len(live_results) > 0:
            print(f"✅ [LIGHT MODE] Parsed {len(live_results)} items. First cover_url: {live_results[0]['cover_url'][:50] if live_results[0]['cover_url'] else 'EMPTY'}")

        return {
            "status": "ok", 
            "mode": "light",
            "items": live_results
        }

    # --- ✅ РЕЖИМ 2: DEEP ANALYZE (ПОЛНАЯ МАТЕМАТИКА + ML) ---
    scorer = TrendScorer()
    processed_trends_objects = [] 
    cascade_total = len(clean_items)
    
    # Подсчет cascade_count для каждого звука
    music_cascade_map = {}
    for item in clean_items:
        music_id = (item.get("music") or {}).get("id") or (item.get("musicMeta") or {}).get("id")
        if music_id:
            music_cascade_map[str(music_id)] = music_cascade_map.get(str(music_id), 0) + 1

    for item in clean_items:
        p_id = str(item.get("id"))
        video_url = item.get("postPage") or item.get("url") or item.get("webVideoUrl")
        views_now = int(item.get("views") or (item.get("stats") or {}).get("playCount") or 0)
        
        # Извлекаем данные для UTS расчета - Apify returns stats directly in item!
        author_meta = item.get("author") or item.get("authorMeta") or item.get("channel") or {}
        stats = item.get("stats") or {}
        
        # Stats from item directly (Apify format) or from stats object
        likes = item.get("likes") or stats.get("diggCount") or stats.get("likes") or 0
        comments = item.get("comments") or stats.get("commentCount") or stats.get("comments") or 0
        shares = item.get("shares") or stats.get("shareCount") or stats.get("shares") or 0
        bookmarks = item.get("bookmarks") or stats.get("collectCount") or stats.get("saveCount") or 0
        
        current_stats = {
            "playCount": views_now,
            "diggCount": int(likes),
            "commentCount": int(comments),
            "shareCount": int(shares)
        }
        
        followers = author_meta.get("fans") or author_meta.get("followers") or 1
        music_id = (item.get("music") or item.get("song") or {}).get("id") or (item.get("musicMeta") or {}).get("id")
        cascade_count = music_cascade_map.get(str(music_id), 1) if music_id else 1

        existing_video = db.query(Trend).filter(or_(Trend.platform_id == p_id, Trend.url == video_url)).first()

        try:
            # Расчет UTS breakdown для Deep Analyze
            # Ensure all values are integers, not None
            uts_data = {
                'views': int(views_now or 0),
                'author_followers': int(followers or 1),
                'collect_count': int(bookmarks or 0),
                'share_count': int(shares or 0),
                'likes': int(likes or 0),
                'comments': int(comments or 0)
            }
            history_data = None
            if existing_video and existing_video.initial_stats:
                history_data = {
                    'play_count': existing_video.initial_stats.get('playCount', views_now)
                }
            
            uts_breakdown = scorer.calculate_uts_breakdown(uts_data, history_data, cascade_count)
            
            if existing_video:
                # ✅ Сброс Точки А при новом сканировании (храним временно для сверки)
                existing_video.initial_stats = current_stats 
                existing_video.stats = current_stats
                existing_video.uts_score = uts_breakdown['final_score']
                existing_video.last_scanned_at = None # Обнуляем, чтобы рескан поставил новую метку
                db.add(existing_video)
                processed_trends_objects.append(existing_video)
            else:
                # Создаем новую запись «буфера»
                # Cover URL - check multiple locations
                v_meta = item.get("video") or item.get("videoMeta") or {}
                cover_url = (
                    v_meta.get("cover") or 
                    v_meta.get("coverUrl") or 
                    v_meta.get("dynamicCover") or 
                    item.get("coverUrl") or 
                    item.get("cover") or 
                    ""
                ).replace(".heic", ".jpeg").replace(".webp", ".jpeg")
                
                new_trend = Trend(
                    platform_id=p_id, url=video_url, 
                    cover_url=cover_url,
                    description=item.get("title") or item.get("desc") or "No desc",
                    stats=current_stats, initial_stats=current_stats,
                    author_username=(item.get("channel") or {}).get("username") or author_meta.get("uniqueId") or "unknown",
                    uts_score=uts_breakdown['final_score'], 
                    vertical=search_targets[0] or "deep_scan",
                    music_id=str(music_id) if music_id else None,
                    last_scanned_at=None
                )
                db.add(new_trend)
                processed_trends_objects.append(new_trend)
            db.commit()
        except Exception as e:
            print(f"⚠️ Error processing video {p_id}: {e}")
            db.rollback()

    # 3. КЛАСТЕРИЗАЦИЯ (Только для Deep Analyze)
    if req.is_deep and processed_trends_objects:
        print(f"🧩 Starting visual clustering for {len(processed_trends_objects)} videos...")
        processed_trends_objects = cluster_trends_by_visuals(processed_trends_objects)
        for t in processed_trends_objects: db.add(t)
        try: db.commit()
        except: db.rollback()

    # 4. ПЛАНИРОВАНИЕ СВЕРКИ (24 часа для velocity tracking)
    if req.is_deep and processed_trends_objects:
        saved_urls = [t.url for t in processed_trends_objects if t.url]
        if saved_urls:
            run_date = datetime.now() + timedelta(hours=req.rescan_hours) 
            scheduler.add_job(
                rescan_videos_task, 'date', run_date=run_date, 
                args=[saved_urls, f"batch_{int(time.time())}"]
            )
            print(f"⏱️ AUTO-RESCAN SCHEDULED: Will run in {req.rescan_hours} hours for velocity tracking.")
    
    # 5. Формируем расширенный ответ с UTS breakdown
    deep_results = []
    for trend in processed_trends_objects:
        trend_dict = trend_to_dict(trend)
        
        # Пересчитываем breakdown для ответа (с актуальными данными из stats)
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
        
        # Добавляем Deep Analyze поля
        trend_dict['uts_breakdown'] = {
            'l1_viral_lift': uts_breakdown['l1_viral_lift'],
            'l2_velocity': uts_breakdown['l2_velocity'],
            'l3_retention': uts_breakdown['l3_retention'],
            'l4_cascade': uts_breakdown['l4_cascade'],
            'l5_saturation': uts_breakdown['l5_saturation'],
            'l7_stability': uts_breakdown['l7_stability'],
            'final_score': uts_breakdown['final_score']
        }
        trend_dict['saturation_score'] = uts_breakdown['l5_saturation']
        trend_dict['cascade_count'] = cascade_count
        trend_dict['cascade_score'] = uts_breakdown['l4_cascade']
        trend_dict['velocity_score'] = uts_breakdown['l2_velocity']
        
        deep_results.append(trend_dict)
    
    # Группировка по кластерам
    clusters_info = {}
    for trend in processed_trends_objects:
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
    
    clusters_list = []
    for cluster_id, info in clusters_info.items():
        clusters_list.append({
            'cluster_id': cluster_id,
            'video_count': info['video_count'],
            'avg_uts': round(info['total_uts'] / info['video_count'], 2) if info['video_count'] > 0 else 0
        })
    
    print(f"✅ [DEEP MODE] Processed {len(deep_results)} items with full UTS breakdown. Clusters: {len(clusters_list)}")

    return {
        "status": "ok",
        "mode": "deep",
        "items": deep_results,
        "clusters": clusters_list
    }