"""
Super Vision Pipeline — Automated AI-curated video discovery.

6-step pipeline:
1. Scrape videos via Apify (TikTok keywords search)
2. Filter by views/date
3. Metadata pre-filter (anti-keywords)
4. Gemini text scoring (relevance 0-100)
5. Gemini Vision on top candidates (watch video, score match)
6. Store results with scores
"""
import os
import re
import time
import logging
from datetime import datetime, timedelta

from ..core.database import SessionLocal
from ..db.models import (
    SuperVisionConfig, SuperVisionResult, SuperVisionStatus,
    Project, User
)

logger = logging.getLogger(__name__)


def _get_gemini_client():
    """Lazy-init Gemini client."""
    try:
        from google import genai
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_GENAI_API_KEY")
        if api_key:
            return genai.Client(api_key=api_key)
    except Exception as e:
        logger.error(f"Gemini client init failed: {e}")
    return None


def _build_vision_relevance_prompt(profile: dict, video: dict) -> str:
    """Build a custom Gemini Vision prompt for project-video match scoring."""
    audience = profile.get("audience", {})
    if isinstance(audience, dict):
        audience_str = f"Age: {audience.get('age', 'any')}, Gender: {audience.get('gender', 'any')}, Interests: {', '.join(audience.get('interests', []))}"
    else:
        audience_str = str(audience)

    return f"""You are an expert content analyst. Watch this video carefully and evaluate
how well it matches the following content project profile.

PROJECT PROFILE:
- Niche: {profile.get('niche', 'general')} / {profile.get('sub_niche', '')}
- Content Format: {', '.join(profile.get('format', ['any']))}
- Target Audience: {audience_str}
- Tone/Style: {profile.get('tone', 'engaging')}
- Topics to EXCLUDE: {', '.join(profile.get('exclude', []))}

VIDEO METADATA:
- Description: {video.get('description', 'N/A')[:200]}
- Author: @{video.get('author_username', 'unknown')}
- Views: {video.get('stats', {}).get('playCount', 0):,}

TASK: Watch the actual video content and answer:

1. VISUAL MATCH (0-25): Does the video visually match the niche?
2. FORMAT MATCH (0-25): Does the video format match? (UGC, tutorial, showcase, etc.)
3. AUDIENCE FIT (0-25): Would this appeal to the target audience?
4. CONTENT QUALITY (0-25): Is this high-quality, non-spammy content worth recommending?

Return your response in this EXACT format:
SCORE: [total 0-100]
MATCH: [Yes/Partial/No]
REASON: [1-2 sentence explanation of why this video does or does not match]
"""


def _parse_vision_score(analysis: str) -> tuple:
    """Parse vision score and reason from Gemini Vision response."""
    score = 50
    reason = ""

    score_match = re.search(r'SCORE:\s*(\d+)', analysis)
    if score_match:
        score = max(0, min(100, int(score_match.group(1))))

    reason_match = re.search(r'REASON:\s*(.+?)(?:\n|$)', analysis)
    if reason_match:
        reason = reason_match.group(1).strip()[:500]

    return score, reason


def _calculate_credits(scan_stats: dict) -> int:
    """Calculate total credits used for a scan."""
    cost = 2  # Apify scraping base cost
    text_scored = scan_stats.get("after_metadata", 0)
    if text_scored > 0:
        cost += max(1, (text_scored + 7) // 8) * 2  # 2 credits per batch of 8
    vision_count = scan_stats.get("vision_analyzed", 0)
    cost += vision_count * 5  # 5 credits per vision analysis
    return cost


def run_super_vision_scan(config_id: int):
    """
    Main pipeline for a single Super Vision scan.
    Called by APScheduler or manual trigger.
    Runs synchronously (APScheduler handles threading).
    """
    import traceback
    print(f"[SUPER VISION] run_super_vision_scan called with config_id={config_id}", flush=True)
    db = SessionLocal()
    config = None
    try:
        config = db.query(SuperVisionConfig).filter(
            SuperVisionConfig.id == config_id
        ).first()
        if not config:
            logger.warning(f"[SUPER VISION] Config {config_id} not found")
            return

        project = db.query(Project).filter(Project.id == config.project_id).first()
        user = db.query(User).filter(User.id == config.user_id).first()
        if not project or not user:
            logger.warning(f"[SUPER VISION] Project or user not found for config {config_id}")
            return

        profile = project.profile_data or {}
        batch_id = f"sv_{config.id}_{int(time.time())}"
        scan_stats = {}
        start_time = time.time()

        logger.info(f"[SUPER VISION] Starting scan for config {config_id} (project: {project.name})")

        # Pre-scan credit check
        total_credits = (user.credits or 0) + (user.rollover_credits or 0) + (user.bonus_credits or 0)
        if total_credits < 20:
            config.last_run_status = "insufficient_credits"
            config.last_run_at = datetime.utcnow()
            config.next_run_at = datetime.utcnow() + timedelta(hours=config.scan_interval_hours)
            db.commit()
            logger.warning(f"[SUPER VISION] Insufficient credits ({total_credits}) for config {config_id}")
            return

        # ── STEP 1: Determine keywords ──────────────────────
        keywords = config.custom_keywords if config.custom_keywords else profile.get("keywords", [])
        if not keywords:
            niche = profile.get("niche", "")
            sub_niche = profile.get("sub_niche", "")
            keywords = [k for k in [niche, sub_niche] if k]
        if not keywords:
            keywords = ["trending"]

        logger.info(f"[SUPER VISION] Keywords: {keywords}")

        # ── STEP 2: Scrape via Apify ────────────────────────
        from ..services.collector import TikTokCollector
        collector = TikTokCollector()
        raw_items = collector.collect(keywords, limit=50, mode="search")
        scan_stats["scraped"] = len(raw_items)
        logger.info(f"[SUPER VISION] Scraped {len(raw_items)} videos")

        if not raw_items:
            config.last_run_at = datetime.utcnow()
            config.last_run_status = "no_results"
            config.last_run_stats = scan_stats
            config.next_run_at = datetime.utcnow() + timedelta(hours=config.scan_interval_hours)
            db.commit()
            return

        # ── STEP 3: Parse + filter by views/date ────────────
        from ..api.trends import parse_video_data
        parsed_videos = []
        cutoff_date = datetime.utcnow() - timedelta(days=config.date_range_days)

        for idx, item in enumerate(raw_items):
            parsed = parse_video_data(item, idx)
            stats = parsed.get("stats", {})
            views = stats.get("playCount", 0) if isinstance(stats, dict) else 0

            # Check minimum views
            if views < config.min_views:
                continue

            # Check date
            created_str = parsed.get("createdAt", "")
            if created_str:
                try:
                    created_ts = datetime.fromtimestamp(int(created_str)) if created_str.isdigit() else datetime.fromisoformat(created_str.replace("Z", "+00:00")).replace(tzinfo=None)
                    if created_ts < cutoff_date:
                        continue
                except Exception:
                    pass

            # Deduplicate against existing results
            vid_id = str(parsed.get("id", "") or parsed.get("platform_id", ""))
            if vid_id:
                existing = db.query(SuperVisionResult).filter(
                    SuperVisionResult.config_id == config.id,
                    SuperVisionResult.video_platform_id == vid_id
                ).first()
                if existing:
                    continue

            parsed_videos.append(parsed)

        scan_stats["after_views_filter"] = len(parsed_videos)
        logger.info(f"[SUPER VISION] After views/date filter: {len(parsed_videos)}")

        if not parsed_videos:
            config.last_run_at = datetime.utcnow()
            config.last_run_status = "filtered_all"
            config.last_run_stats = scan_stats
            config.next_run_at = datetime.utcnow() + timedelta(hours=config.scan_interval_hours)
            db.commit()
            return

        # ── STEP 4: Metadata pre-filter ─────────────────────
        from ..services.project_filter import metadata_prefilter, batch_ai_score
        passed, rejected = metadata_prefilter(parsed_videos, profile)
        scan_stats["after_metadata"] = len(passed)
        logger.info(f"[SUPER VISION] After metadata filter: {len(passed)} passed, {len(rejected)} rejected")

        # ── STEP 5: Gemini text scoring ─────────────────────
        gemini_client = _get_gemini_client()
        above_threshold = passed  # fallback if no gemini

        if gemini_client and passed:
            try:
                scored = batch_ai_score(passed, profile, gemini_client, project.id, db)
                above_threshold = [
                    v for v in scored
                    if v.get("relevance_score", 0) >= config.text_score_threshold
                ]
                above_threshold.sort(key=lambda v: v.get("relevance_score", 0), reverse=True)
            except Exception as e:
                logger.error(f"[SUPER VISION] Text scoring failed: {e}")
                above_threshold = passed

        scan_stats["after_ai_text"] = len(above_threshold)
        logger.info(f"[SUPER VISION] After AI text scoring (threshold={config.text_score_threshold}): {len(above_threshold)}")

        # ── STEP 6: Gemini Vision on top N ──────────────────
        from ..services.video_analyzer import analyze_video_with_gemini
        vision_candidates = above_threshold[:config.max_vision_videos]
        vision_analyzed = 0

        for video in vision_candidates:
            video_url = video.get("url", "") or video.get("webVideoUrl", "")
            if not video_url:
                continue

            vision_prompt = _build_vision_relevance_prompt(profile, video)

            try:
                analysis = analyze_video_with_gemini(
                    video_url=video_url,
                    video_metadata={
                        "platform": config.platform or "TikTok",
                        "author": video.get("author_username", ""),
                        "views": str(video.get("stats", {}).get("playCount", 0)),
                        "desc": (video.get("description", "") or "")[:200],
                    },
                    custom_prompt=vision_prompt
                )

                vision_score, match_reason = _parse_vision_score(analysis)
                video["vision_score"] = vision_score
                video["vision_analysis"] = analysis
                video["vision_match_reason"] = match_reason
                vision_analyzed += 1
                logger.info(f"[SUPER VISION] Vision score for {video_url[:60]}: {vision_score}")
            except Exception as e:
                logger.error(f"[SUPER VISION] Vision failed for {video_url[:60]}: {e}")
                video["vision_score"] = None
                video["vision_analysis"] = None
                video["vision_match_reason"] = f"Vision failed: {str(e)[:100]}"

        scan_stats["vision_analyzed"] = vision_analyzed

        # ── STEP 7: Compute final scores + store results ────
        all_candidates = above_threshold  # includes both vision and non-vision
        results_stored = 0
        seen_vid_ids = set()  # Deduplicate within batch

        for video in all_candidates:
            text_score = video.get("relevance_score", 0)
            vision_score = video.get("vision_score")

            if vision_score is not None:
                final_score = int(text_score * 0.4 + vision_score * 0.6)
            else:
                final_score = text_score

            vid_id = str(video.get("id", "") or video.get("platform_id", ""))
            if not vid_id or vid_id in seen_vid_ids:
                continue
            seen_vid_ids.add(vid_id)

            # Skip if already exists in DB
            existing = db.query(SuperVisionResult).filter(
                SuperVisionResult.config_id == config.id,
                SuperVisionResult.video_platform_id == vid_id
            ).first()
            if existing:
                continue

            result = SuperVisionResult(
                config_id=config.id,
                user_id=config.user_id,
                project_id=config.project_id,
                video_platform_id=vid_id,
                video_url=video.get("url", "") or video.get("webVideoUrl", ""),
                video_cover_url=video.get("cover_url", ""),
                video_play_addr=video.get("play_addr", ""),
                video_description=(video.get("description", "") or "")[:500],
                video_author=video.get("author_username", ""),
                video_stats=video.get("stats", {}),
                text_score=text_score,
                text_reason=video.get("relevance_reason", "")[:255] if video.get("relevance_reason") else None,
                vision_score=vision_score,
                vision_analysis=video.get("vision_analysis"),
                vision_match_reason=video.get("vision_match_reason"),
                final_score=final_score,
                scan_batch_id=batch_id,
            )
            db.add(result)
            results_stored += 1

        scan_stats["final_results"] = results_stored

        # ── STEP 8: Deduct credits + update config ──────────
        credits_used = _calculate_credits(scan_stats)
        scan_stats["credits_used"] = credits_used
        scan_stats["duration_seconds"] = int(time.time() - start_time)

        # Deduct credits (prefer bonus → rollover → main)
        remaining = credits_used
        if user.bonus_credits and user.bonus_credits > 0:
            deduct = min(remaining, user.bonus_credits)
            user.bonus_credits -= deduct
            remaining -= deduct
        if remaining > 0 and user.rollover_credits and user.rollover_credits > 0:
            deduct = min(remaining, user.rollover_credits)
            user.rollover_credits -= deduct
            remaining -= deduct
        if remaining > 0:
            user.credits = max(0, (user.credits or 0) - remaining)

        config.last_run_at = datetime.utcnow()
        config.last_run_status = "success"
        config.last_run_stats = scan_stats
        config.consecutive_errors = 0
        config.last_error = None
        config.next_run_at = datetime.utcnow() + timedelta(hours=config.scan_interval_hours)

        db.commit()
        logger.info(f"[SUPER VISION] Scan complete for config {config_id}: {scan_stats}")

    except Exception as e:
        print(f"[SUPER VISION] SCAN FAILED: {e}", flush=True)
        traceback.print_exc()
        logger.error(f"[SUPER VISION] Scan failed for config {config_id}: {e}")
        try:
            if config:
                config.last_run_status = "failed"
                config.consecutive_errors = (config.consecutive_errors or 0) + 1
                config.last_error = str(e)[:500]
                config.next_run_at = datetime.utcnow() + timedelta(hours=config.scan_interval_hours)
                # Auto-pause after 3 consecutive errors
                if config.consecutive_errors >= 3:
                    config.status = SuperVisionStatus.ERROR
                    if config.scheduler_job_id:
                        remove_super_vision_job(config.scheduler_job_id)
                        config.scheduler_job_id = None
                db.commit()
        except Exception:
            db.rollback()
    finally:
        db.close()


# =============================================================================
# SCHEDULER HELPERS
# =============================================================================

def schedule_super_vision_job(config_id: int, run_at: datetime, interval_hours: int) -> str:
    """Schedule a recurring Super Vision scan job."""
    from .scheduler import scheduler
    job_id = f"sv_config_{config_id}"

    try:
        scheduler.remove_job(job_id)
    except Exception:
        pass

    scheduler.add_job(
        run_super_vision_scan,
        'interval',
        hours=interval_hours,
        id=job_id,
        args=[config_id],
        next_run_time=run_at,
        replace_existing=True,
        misfire_grace_time=3600,
    )
    logger.info(f"[SUPER VISION] Scheduled job {job_id} every {interval_hours}h, next run: {run_at}")
    return job_id


def remove_super_vision_job(job_id: str):
    """Remove a Super Vision scheduled job."""
    from .scheduler import scheduler
    try:
        scheduler.remove_job(job_id)
        logger.info(f"[SUPER VISION] Removed job {job_id}")
    except Exception as e:
        logger.warning(f"[SUPER VISION] Could not remove job {job_id}: {e}")


def restore_active_scans():
    """Restore all active Super Vision scheduled jobs on server startup."""
    db = SessionLocal()
    try:
        active_configs = db.query(SuperVisionConfig).filter(
            SuperVisionConfig.status == SuperVisionStatus.ACTIVE
        ).all()

        for config in active_configs:
            next_run = config.next_run_at or (datetime.utcnow() + timedelta(hours=config.scan_interval_hours))
            # If next_run is in the past, schedule for 5 minutes from now
            if next_run < datetime.utcnow():
                next_run = datetime.utcnow() + timedelta(minutes=5)

            job_id = schedule_super_vision_job(config.id, next_run, config.scan_interval_hours)
            config.scheduler_job_id = job_id

        db.commit()
        logger.info(f"[SUPER VISION] Restored {len(active_configs)} active scan jobs")
    except Exception as e:
        logger.error(f"[SUPER VISION] Failed to restore scans: {e}")
    finally:
        db.close()
