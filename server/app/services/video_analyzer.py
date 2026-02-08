"""
Video Analyzer Service
Downloads videos and analyzes them using Gemini's native video understanding.
"""

import os
import tempfile
import logging
import time
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Temp directory for downloaded videos
TEMP_VIDEO_DIR = os.path.join(tempfile.gettempdir(), "risko_videos")
os.makedirs(TEMP_VIDEO_DIR, exist_ok=True)


def download_video(url: str, max_duration: int = 120) -> Optional[str]:
    """
    Download video from URL using yt-dlp.
    Returns path to downloaded file, or None on failure.

    Supports: TikTok, Instagram, YouTube Shorts, etc.
    """
    import yt_dlp
    import glob

    output_template = os.path.join(TEMP_VIDEO_DIR, f"video_{int(time.time() * 1000)}")

    def duration_filter(info_dict, *, incomplete):
        """Filter out videos longer than max_duration."""
        duration = info_dict.get('duration')
        if duration and duration > max_duration:
            return f"Video too long: {duration}s > {max_duration}s"
        return None

    ydl_opts = {
        'outtmpl': output_template + '.%(ext)s',
        'format': 'best[ext=mp4]/best',
        'merge_output_format': 'mp4',
        'quiet': True,
        'no_warnings': True,
        'socket_timeout': 30,
        'retries': 3,
        'match_filter': duration_filter,
        'noplaylist': True,
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        },
    }

    try:
        logger.info(f"[VIDEO] Downloading: {url}")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            logger.info(f"[VIDEO] Extracted info: title={info.get('title', 'N/A')}, duration={info.get('duration', 'N/A')}s")

        # Find the downloaded file (extension may vary)
        downloaded = glob.glob(output_template + '.*')
        if downloaded:
            file_path = downloaded[0]
            size_mb = os.path.getsize(file_path) / (1024 * 1024)
            logger.info(f"[VIDEO] Downloaded: {size_mb:.1f}MB -> {file_path}")
            return file_path
        else:
            logger.error("[VIDEO] No downloaded file found")
            return None

    except Exception as e:
        logger.error(f"[VIDEO] Download failed: {e}", exc_info=True)
        # Cleanup any partial files
        for f in glob.glob(output_template + '.*'):
            try:
                os.remove(f)
            except Exception:
                pass
        return None


def upload_to_gemini(file_path: str) -> Optional[object]:
    """
    Upload a video file to Gemini Files API.
    Returns the file object for use in generate_content.
    """
    from google import genai

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise Exception("GEMINI_API_KEY not set")

    client = genai.Client(api_key=api_key)

    try:
        file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
        logger.info(f"[VIDEO] Uploading to Gemini: {file_path} ({file_size_mb:.1f}MB)")
        uploaded_file = client.files.upload(file=file_path)

        state = str(getattr(uploaded_file.state, 'name', uploaded_file.state)).upper()
        logger.info(f"[VIDEO] Uploaded: {uploaded_file.name} (state={state})")

        # Wait for processing (Gemini needs time for video)
        max_wait = 90  # seconds
        waited = 0
        while state == "PROCESSING" and waited < max_wait:
            time.sleep(3)
            waited += 3
            uploaded_file = client.files.get(name=uploaded_file.name)
            state = str(getattr(uploaded_file.state, 'name', uploaded_file.state)).upper()
            logger.info(f"[VIDEO] Processing... ({waited}s, state={state})")

        if state == "ACTIVE":
            logger.info(f"[VIDEO] File ready: {uploaded_file.name}")
            return uploaded_file
        else:
            logger.error(f"[VIDEO] File not ready after {waited}s: state={state}")
            return None

    except Exception as e:
        logger.error(f"[VIDEO] Upload to Gemini failed: {e}", exc_info=True)
        return None


def analyze_video_with_gemini(
    video_url: str,
    video_metadata: dict = None,
    custom_prompt: str = None,
) -> str:
    """
    Full pipeline: download video -> upload to Gemini -> analyze.

    Returns detailed AI analysis of the actual video content.
    """
    from google import genai

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return "GEMINI_API_KEY not configured"

    file_path = None
    uploaded_file = None

    try:
        # Step 1: Download
        file_path = download_video(video_url)
        if not file_path:
            return _fallback_text_analysis(video_metadata, custom_prompt)

        # Step 2: Upload to Gemini
        uploaded_file = upload_to_gemini(file_path)
        if not uploaded_file:
            return _fallback_text_analysis(video_metadata, custom_prompt)

        # Step 3: Build analysis prompt
        meta_context = ""
        if video_metadata:
            meta_context = f"""
**Video Metadata:**
- Platform: {video_metadata.get('platform', 'Unknown')}
- Creator: @{video_metadata.get('author', 'unknown')}
- Views: {video_metadata.get('views', 'N/A')}
- Viral Score: {video_metadata.get('uts', 'N/A')}/100
- Description: {video_metadata.get('desc', 'N/A')}
"""

        if custom_prompt:
            analysis_prompt = f"""{meta_context}

{custom_prompt}

Analyze the video above to answer this request. Be detailed and specific about what you see in the actual video."""
        else:
            analysis_prompt = f"""You are an expert short-form video analyst for TikTok, Instagram Reels, and YouTube Shorts.

{meta_context}

Analyze this video in detail and provide:

## Visual Analysis
- What is shown in the video? Describe the key scenes, transitions, and visual elements
- Camera angles, movements, and framing techniques used
- Text overlays, captions, and on-screen graphics
- Color palette and visual aesthetic

## Audio Analysis
- Background music/sound — describe the mood, tempo, genre
- Voice-over or spoken content — transcribe key phrases
- Sound effects or audio transitions
- How audio enhances the visual content

## Content Strategy
- The hook (first 1-3 seconds) — what grabs attention?
- Story structure and pacing — how does the narrative flow?
- Call-to-action or engagement trigger
- Target audience and content niche

## Viral Mechanics
- What makes this video engaging/shareable?
- Psychological triggers used (curiosity, FOMO, humor, etc.)
- Trending elements (sounds, formats, challenges)
- Retention techniques (pattern interrupts, reveals, etc.)

## Replicable Elements
- Key techniques that can be adapted for new content
- Specific hooks or transitions worth copying
- Content formula/template extracted from this video

Be specific about what you ACTUALLY SEE and HEAR in the video. Reference exact moments and timestamps when possible."""

        # Step 4: Generate analysis with Gemini
        client = genai.Client(api_key=api_key)
        logger.info("[VIDEO] Analyzing with Gemini...")

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[uploaded_file, analysis_prompt],
        )

        result = response.text.strip() if response.text else "No analysis generated"
        logger.info(f"[VIDEO] Analysis complete: {len(result)} chars")
        return result

    except Exception as e:
        logger.error(f"[VIDEO] Analysis failed: {e}")
        return f"Video analysis error: {str(e)}\n\n{_fallback_text_analysis(video_metadata, custom_prompt)}"

    finally:
        # Cleanup: remove downloaded file
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
                logger.info(f"[VIDEO] Cleaned up: {file_path}")
            except Exception:
                pass

        # Cleanup: delete from Gemini Files
        if uploaded_file:
            try:
                client = genai.Client(api_key=api_key)
                client.files.delete(name=uploaded_file.name)
                logger.info(f"[VIDEO] Deleted from Gemini: {uploaded_file.name}")
            except Exception:
                pass


def _fallback_text_analysis(metadata: dict = None, custom_prompt: str = None) -> str:
    """Fallback when video download/upload fails — analyze from metadata only."""
    if not metadata:
        return "Could not download video and no metadata available."

    logger.warning("[VIDEO] Using text-only fallback analysis")

    return f"""# Video Analysis (Text-Based Fallback)

*Could not download the actual video. Analysis based on metadata only.*

## Basic Info
- **Platform:** {metadata.get('platform', 'Unknown')}
- **Creator:** @{metadata.get('author', 'unknown')}
- **Views:** {metadata.get('views', 'N/A')}
- **Viral Score:** {metadata.get('uts', 'N/A')}/100

## Content Description
{metadata.get('desc', 'No description')}

## Reference URL
{metadata.get('url', 'Not available')}

---
**Note:** For full visual + audio analysis, ensure the video URL is accessible and try again."""


def cleanup_old_videos(max_age_hours: int = 1):
    """Remove old downloaded videos from temp directory."""
    import glob

    cutoff = time.time() - (max_age_hours * 3600)
    for f in glob.glob(os.path.join(TEMP_VIDEO_DIR, "video_*.mp4")):
        try:
            if os.path.getmtime(f) < cutoff:
                os.remove(f)
                logger.info(f"[VIDEO] Cleaned old file: {f}")
        except Exception:
            pass
