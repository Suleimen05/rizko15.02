"""
Projects API — Content strategy profiles for personalizing AI and search.

Each project is a brand/content profile that:
- Personalizes AI chat and script generation
- Filters trend search results by relevance
- Groups saved videos and competitors
"""
import os
import json
import re
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..db.models import Project, User, Competitor, UserFavorite
from ..api.dependencies import get_current_user, CreditManager

logger = logging.getLogger(__name__)

router = APIRouter()


# =============================================================================
# SCHEMAS
# =============================================================================

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    icon: Optional[str] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    icon: Optional[str] = None
    status: Optional[str] = None
    profile_data: Optional[dict] = None

class GenerateProfileRequest(BaseModel):
    form_data: dict = Field(default_factory=dict)
    description_text: str = Field(default="")

class ProjectResponse(BaseModel):
    id: int
    name: str
    icon: Optional[str]
    status: str
    profile_data: dict
    raw_input: dict
    created_at: str
    updated_at: str
    competitors_count: int = 0
    favorites_count: int = 0

    class Config:
        from_attributes = True


# =============================================================================
# HELPERS
# =============================================================================

def _get_user_project(project_id: int, user: User, db: Session) -> Project:
    """Get project owned by user or raise 404."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def _project_to_response(project: Project, db: Session) -> dict:
    """Convert Project model to response dict with counts."""
    competitors_count = db.query(Competitor).filter(
        Competitor.project_id == project.id
    ).count()
    favorites_count = db.query(UserFavorite).filter(
        UserFavorite.project_id == project.id
    ).count()
    return {
        "id": project.id,
        "name": project.name,
        "icon": project.icon,
        "status": project.status,
        "profile_data": project.profile_data or {},
        "raw_input": project.raw_input or {},
        "created_at": project.created_at.isoformat() if project.created_at else "",
        "updated_at": project.updated_at.isoformat() if project.updated_at else "",
        "competitors_count": competitors_count,
        "favorites_count": favorites_count,
    }


def _get_gemini_client():
    """Get Gemini client for profile generation."""
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_GENAI_API_KEY")
    if not api_key or api_key.startswith("your_"):
        return None
    try:
        from google import genai
        return genai.Client(api_key=api_key)
    except Exception as e:
        logger.error(f"Failed to init Gemini: {e}")
        return None


# =============================================================================
# CRUD ENDPOINTS
# =============================================================================

@router.get("/")
async def list_projects(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all projects for the current user."""
    query = db.query(Project).filter(Project.user_id == current_user.id)
    if status_filter:
        query = query.filter(Project.status == status_filter)
    projects = query.order_by(Project.updated_at.desc()).all()
    return [_project_to_response(p, db) for p in projects]


@router.post("/", status_code=201)
async def create_project(
    data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new project (step 1 of onboarding)."""
    project = Project(
        user_id=current_user.id,
        name=data.name,
        icon=data.icon,
        status="active",
        profile_data={},
        raw_input={},
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return _project_to_response(project, db)


@router.get("/{project_id}")
async def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get project details."""
    project = _get_user_project(project_id, current_user, db)
    return _project_to_response(project, db)


@router.patch("/{project_id}")
async def update_project(
    project_id: int,
    data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update project fields."""
    project = _get_user_project(project_id, current_user, db)

    if data.name is not None:
        project.name = data.name
    if data.icon is not None:
        project.icon = data.icon
    if data.status is not None:
        if data.status not in ("active", "archived"):
            raise HTTPException(status_code=400, detail="Invalid status")
        project.status = data.status
    if data.profile_data is not None:
        project.profile_data = data.profile_data

    project.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(project)
    return _project_to_response(project, db)


@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a project. Competitors/favorites are unlinked (SET NULL)."""
    project = _get_user_project(project_id, current_user, db)
    db.delete(project)
    db.commit()
    return {"detail": "Project deleted"}


# =============================================================================
# AI PROFILE GENERATION
# =============================================================================

@router.post("/{project_id}/generate-profile")
async def generate_profile(
    project_id: int,
    data: GenerateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate AI content profile from form data + text description.
    Costs 2 credits.
    """
    project = _get_user_project(project_id, current_user, db)

    # Check credits
    await CreditManager.check_and_deduct("project_generate_profile", current_user, db)

    # Save raw input
    project.raw_input = {
        "form_data": data.form_data,
        "description_text": data.description_text,
    }

    # Build prompt for Gemini
    form_info = json.dumps(data.form_data, ensure_ascii=False) if data.form_data else "Not provided"

    prompt = f"""You are an expert content strategist. Based on the user's input, generate a detailed content profile.

USER FORM DATA:
{form_info}

USER DESCRIPTION:
{data.description_text or 'Not provided'}

Generate a structured JSON profile with these fields:
{{
  "niche": "main niche (1-2 words)",
  "sub_niche": "specific sub-niches, comma-separated",
  "format": ["content format 1", "format 2"],
  "audience": {{
    "age": "age range",
    "gender": "target gender or 'all'",
    "interests": ["interest 1", "interest 2", "interest 3"],
    "level": "beginner/intermediate/advanced"
  }},
  "tone": "tone descriptors, comma-separated",
  "platforms": ["platform 1", "platform 2"],
  "exclude": ["content type to exclude 1", "exclude 2"],
  "reference_accounts": [],
  "keywords": ["keyword 1", "keyword 2", "keyword 3", "keyword 4", "keyword 5"],
  "anti_keywords": ["anti-keyword 1", "anti-keyword 2", "anti-keyword 3"]
}}

IMPORTANT:
- keywords: terms that should appear in relevant content
- anti_keywords: terms that indicate irrelevant content
- exclude: types of content to filter out (e.g. "clickbait", "spam", "sexualized content")
- Be specific and practical. These will be used for AI search filtering.

Return ONLY valid JSON, no other text."""

    client = _get_gemini_client()
    if not client:
        # Fallback: generate basic profile from form data
        profile = _fallback_profile(data.form_data, data.description_text)
    else:
        try:
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
                config={"temperature": 0.0}
            )
            profile = _parse_json_response(response.text)
            if not profile:
                profile = _fallback_profile(data.form_data, data.description_text)
        except Exception as e:
            logger.error(f"Gemini profile generation error: {e}")
            profile = _fallback_profile(data.form_data, data.description_text)

    project.profile_data = profile
    project.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(project)
    return _project_to_response(project, db)


@router.post("/{project_id}/transcribe")
async def transcribe_audio(
    project_id: int,
    audio: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Transcribe audio file to text using Gemini.
    Costs 1 credit. Supports webm, mp3, wav, ogg, m4a.
    """
    project = _get_user_project(project_id, current_user, db)

    # Check credits
    await CreditManager.check_and_deduct("project_transcribe", current_user, db)

    # Read audio data
    audio_data = await audio.read()
    if len(audio_data) > 25 * 1024 * 1024:  # 25MB limit
        raise HTTPException(status_code=400, detail="Audio file too large (max 25MB)")

    # Determine mime type
    content_type = audio.content_type or "audio/webm"
    ext = audio.filename.split(".")[-1].lower() if audio.filename and "." in audio.filename else "webm"
    mime_map = {
        "webm": "audio/webm",
        "mp3": "audio/mp3",
        "wav": "audio/wav",
        "ogg": "audio/ogg",
        "m4a": "audio/mp4",
    }
    mime_type = mime_map.get(ext, content_type)

    client = _get_gemini_client()
    if not client:
        raise HTTPException(status_code=503, detail="AI service unavailable")

    try:
        # Send audio as inline data (no file upload needed)
        from google.genai import types

        audio_part = types.Part.from_bytes(data=audio_data, mime_type=mime_type)

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[
                audio_part,
                "Transcribe this audio accurately. Return ONLY the transcribed text, nothing else."
            ]
        )

        text = response.text.strip() if response.text else ""
        return {"text": text}

    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


# =============================================================================
# HELPERS
# =============================================================================

def _parse_json_response(text: str) -> Optional[dict]:
    """Extract JSON from AI response."""
    try:
        # Try ```json ... ``` block
        match = re.search(r'```json\s*(.*?)\s*```', text, re.DOTALL)
        if match:
            return json.loads(match.group(1))
        # Try raw JSON
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
    except (json.JSONDecodeError, Exception) as e:
        logger.warning(f"Failed to parse JSON: {e}")
    return None


def _fallback_profile(form_data: dict, description: str) -> dict:
    """Generate basic profile from form data without AI."""
    niche = form_data.get("niche", "general")
    fmt = form_data.get("format", "ugc")
    platforms = form_data.get("platforms") or form_data.get("platform") or ["tiktok"]
    if isinstance(platforms, str):
        platforms = [platforms]
    audience = form_data.get("audience", "18-35")

    return {
        "niche": niche,
        "sub_niche": niche,
        "format": [fmt] if isinstance(fmt, str) else fmt,
        "audience": {
            "age": audience if isinstance(audience, str) else "18-35",
            "gender": "all",
            "interests": [niche],
            "level": "all"
        },
        "tone": "engaging, authentic",
        "platforms": platforms,
        "exclude": ["spam", "clickbait"],
        "reference_accounts": [],
        "keywords": [niche],
        "anti_keywords": [],
    }
