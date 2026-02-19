"""
Project-based video filtering and AI relevance scoring.

Two-stage pipeline:
1. metadata_prefilter — instant, free, removes ~30-40% irrelevant videos
2. batch_ai_score — Gemini batch scoring (15-20 videos per request, temperature=0)
"""
import json
import re
import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from ..db.models import ProjectVideoScore

logger = logging.getLogger(__name__)

BATCH_SIZE = 8  # Videos per Gemini request (smaller = more reliable parsing)
CACHE_TTL_HOURS = 24


def metadata_prefilter(videos: list, profile: dict) -> tuple:
    """
    Fast metadata filter. Rejects videos containing exclude/anti-keywords.
    Free and instant. Returns (passed, rejected).
    """
    exclude_words = set()
    for word in profile.get("exclude", []) + profile.get("anti_keywords", []):
        exclude_words.add(word.lower().strip())

    passed, rejected = [], []
    for video in videos:
        desc = (video.get("description", "") or "").lower()
        hashtags = []
        for h in video.get("hashtags", []):
            if isinstance(h, dict):
                hashtags.append(h.get("name", "").lower())
            elif isinstance(h, str):
                hashtags.append(h.lower())
        all_text = desc + " " + " ".join(hashtags)

        # Reject if any exclude word found
        rejected_flag = False
        matched_word = ""
        for word in exclude_words:
            if word and word in all_text:
                rejected_flag = True
                matched_word = word
                break

        if rejected_flag:
            vid_desc = (video.get("description", "") or "")[:80]
            logger.info(f"  REJECTED: \"{vid_desc}\" — matched exclude word: '{matched_word}'")
            rejected.append(video)
        else:
            passed.append(video)

    logger.info(f"Metadata prefilter: {len(passed)} passed, {len(rejected)} rejected (exclude words: {exclude_words})")
    return passed, rejected


def batch_ai_score(
    videos: list,
    profile: dict,
    gemini_client,
    project_id: int,
    db: Optional[Session] = None
) -> list:
    """
    Batch AI scoring via Gemini (temperature=0).
    Scores are cached per project+video for 24 hours.
    Returns videos with 'relevance_score' and 'relevance_reason' attached.
    """
    if not videos:
        return []

    # Check cache first
    cached_scores = {}
    uncached_videos = []

    if db:
        cutoff = datetime.utcnow() - timedelta(hours=CACHE_TTL_HOURS)
        for video in videos:
            platform_id = video.get("platform_id") or video.get("id") or ""
            if not platform_id:
                uncached_videos.append(video)
                continue

            cached = db.query(ProjectVideoScore).filter(
                ProjectVideoScore.project_id == project_id,
                ProjectVideoScore.video_platform_id == str(platform_id),
                ProjectVideoScore.scored_at > cutoff
            ).first()

            if cached:
                cached_scores[str(platform_id)] = {
                    "score": cached.score,
                    "reason": cached.reason or ""
                }
            else:
                uncached_videos.append(video)
    else:
        uncached_videos = videos

    logger.info(f"AI scoring: {len(cached_scores)} cached, {len(uncached_videos)} to score")

    # Score uncached videos in batches
    new_scores = {}
    if uncached_videos and gemini_client:
        for i in range(0, len(uncached_videos), BATCH_SIZE):
            batch = uncached_videos[i:i + BATCH_SIZE]
            batch_scores = _score_batch(batch, profile, gemini_client)
            new_scores.update(batch_scores)

        # Save new scores to cache
        if db:
            for platform_id, score_data in new_scores.items():
                try:
                    existing = db.query(ProjectVideoScore).filter(
                        ProjectVideoScore.project_id == project_id,
                        ProjectVideoScore.video_platform_id == str(platform_id)
                    ).first()

                    if existing:
                        existing.score = score_data["score"]
                        existing.reason = score_data.get("reason", "")
                        existing.scored_at = datetime.utcnow()
                    else:
                        db.add(ProjectVideoScore(
                            project_id=project_id,
                            video_platform_id=str(platform_id),
                            score=score_data["score"],
                            reason=score_data.get("reason", ""),
                        ))
                except Exception as e:
                    logger.warning(f"Cache save error for {platform_id}: {e}")
            try:
                db.commit()
            except Exception as e:
                logger.error(f"Cache commit error: {e}")
                db.rollback()

    # Merge all scores into videos
    all_scores = {**cached_scores, **new_scores}
    result = []
    for video in videos:
        platform_id = str(video.get("platform_id") or video.get("id") or "")
        score_data = all_scores.get(platform_id, {"score": 50, "reason": "unscored"})
        video["relevance_score"] = score_data["score"]
        video["relevance_reason"] = score_data.get("reason", "")
        result.append(video)

    return result


def _score_batch(videos: list, profile: dict, gemini_client) -> dict:
    """Score a batch of videos via Gemini. Returns {platform_id: {score, reason}}."""
    video_descriptions = []
    video_ids = []
    for i, v in enumerate(videos):
        platform_id = str(v.get("platform_id") or v.get("id") or f"unknown_{i}")
        video_ids.append(platform_id)

        hashtags_raw = v.get("hashtags", [])
        hashtags = []
        for h in hashtags_raw:
            if isinstance(h, dict):
                hashtags.append(h.get("name", ""))
            elif isinstance(h, str):
                hashtags.append(h)

        author = v.get("author", {})
        if isinstance(author, dict):
            followers = author.get("followerCount", 0) or author.get("followers_count", 0)
        else:
            followers = 0

        stats = v.get("stats", {})
        views = stats.get("playCount", 0) if isinstance(stats, dict) else 0
        author_name = v.get("author_username", "") or (author.get("uniqueId", "") if isinstance(author, dict) else "")

        desc = f'{i+1}. "{(v.get("description", "") or "")[:150]}" | Tags: {", ".join(hashtags[:5])} | @{author_name} ({followers} fol) | {views} views'
        video_descriptions.append(desc)

    audience = profile.get("audience", {})
    if isinstance(audience, dict):
        audience_str = f"Age: {audience.get('age', 'any')}, Gender: {audience.get('gender', 'any')}, Interests: {', '.join(audience.get('interests', []))}"
    else:
        audience_str = str(audience)

    prompt = f"""Score each video's relevance to this content project (0-100).

PROJECT PROFILE:
- Niche: {profile.get('niche', 'general')} / {profile.get('sub_niche', '')}
- Format: {', '.join(profile.get('format', []))}
- Audience: {audience_str}
- Style: {profile.get('tone', '')}
- EXCLUDE: {', '.join(profile.get('exclude', []))}

SCORING RUBRIC (each 0-25):
1. Topic match — does the content match the niche/sub-niche?
2. Format match — does the video format match (UGC, tutorial, etc.)?
3. Audience match — is this for the right audience?
4. Clean content — no excluded elements (clickbait, spam, etc.)?

VIDEOS:
{chr(10).join(video_descriptions)}

Return ONLY valid JSON array, no other text:
[{{"id": 1, "score": 85, "reason": "3 words max"}}, ...]"""

    logger.info(f"=== GEMINI PROMPT (batch {len(videos)} videos) ===\n{prompt}\n=== END PROMPT ===")

    try:
        response = gemini_client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config={"temperature": 0.0}
        )

        raw_text = response.text
        logger.info(f"=== GEMINI RAW RESPONSE (batch {len(videos)} videos) ===\n{raw_text}\n=== END GEMINI RESPONSE ===")
        scores_list = _parse_scores_response(raw_text)
        logger.info(f"Gemini returned {len(scores_list)} scores for {len(video_ids)} videos")
        result = {}
        for item in scores_list:
            idx = item.get("id", 0)
            if isinstance(idx, int) and 1 <= idx <= len(video_ids):
                pid = video_ids[idx - 1]
                result[pid] = {
                    "score": max(0, min(100, item.get("score", 50))),
                    "reason": item.get("reason", "")[:255]
                }

        # For videos not scored by Gemini, assign neutral score
        for pid in video_ids:
            if pid not in result:
                result[pid] = {"score": 50, "reason": "unscored"}

        return result

    except Exception as e:
        logger.error(f"Batch scoring error: {e}")
        # Return neutral scores on failure
        return {pid: {"score": 50, "reason": "scoring error"} for pid in video_ids}


def _parse_scores_response(text: str) -> list:
    """Parse JSON array from Gemini response."""
    try:
        match = re.search(r'```json\s*(.*?)\s*```', text, re.DOTALL)
        if match:
            return json.loads(match.group(1))
        match = re.search(r'\[.*\]', text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
    except (json.JSONDecodeError, Exception) as e:
        logger.warning(f"Failed to parse scores: {e}")
    return []
