"""
Pydantic schemas for AI-Generated Scripts.

Handles:
- Script generation requests
- Saved scripts management
- Script organization
"""
from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, Field, field_validator
import re


# =============================================================================
# SCRIPT GENERATION REQUEST
# =============================================================================

class ScriptGenerateRequest(BaseModel):
    """Request for AI script generation."""
    video_description: str = Field(
        ...,
        min_length=10,
        max_length=2000,
        description="Description of the video/trend to base script on"
    )
    video_stats: Dict[str, int] = Field(
        default={
            "playCount": 0,
            "diggCount": 0,
            "commentCount": 0,
            "shareCount": 0
        },
        description="Video statistics for context"
    )
    tone: str = Field(
        default="engaging",
        description="Script tone: engaging, educational, humorous, inspirational"
    )
    niche: str = Field(
        default="general",
        max_length=100,
        description="Content niche"
    )
    duration_seconds: int = Field(
        default=30,
        ge=10,
        le=180,
        description="Target video duration (10-180 seconds)"
    )
    language: str = Field(
        default="en",
        max_length=10,
        description="Script language code"
    )

    @field_validator('tone')
    @classmethod
    def validate_tone(cls, v: str) -> str:
        """Validate tone is one of allowed values."""
        allowed = ['engaging', 'educational', 'humorous', 'inspirational', 'professional', 'casual']
        if v.lower() not in allowed:
            return 'engaging'
        return v.lower()

    @field_validator('video_description')
    @classmethod
    def sanitize_description(cls, v: str) -> str:
        """Sanitize video description."""
        sanitized = re.sub(r'[<>]', '', v)
        return sanitized.strip()


class ScriptGenerateResponse(BaseModel):
    """Response from AI script generation."""
    hook: str = Field(..., description="Opening hook (first 3 seconds)")
    body: List[str] = Field(..., description="Script body sections")
    cta: str = Field(..., description="Call to action")
    viralElements: List[str] = Field(default=[], description="Viral elements identified")
    tips: List[str] = Field(default=[], description="Pro tips for execution")
    duration: int = Field(..., description="Estimated duration in seconds")
    generatedAt: str = Field(..., description="Generation timestamp")
    fallback: Optional[bool] = Field(None, description="True if fallback script used")


# =============================================================================
# SAVED SCRIPT SCHEMAS
# =============================================================================

class ScriptCreate(BaseModel):
    """Schema for saving a generated script."""
    title: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Script title"
    )
    hook: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Opening hook"
    )
    body: List[str] = Field(
        ...,
        min_items=1,
        max_items=20,
        description="Script body sections"
    )
    call_to_action: Optional[str] = Field(
        None,
        max_length=500,
        description="Call to action"
    )
    source_trend_id: Optional[int] = Field(
        None,
        gt=0,
        description="Source trend ID if generated from a trend"
    )
    tone: str = Field(default="engaging", max_length=50)
    niche: Optional[str] = Field(None, max_length=100)
    duration_seconds: int = Field(default=30, ge=10, le=180)
    language: str = Field(default="en", max_length=10)
    viral_elements: List[str] = Field(default=[])
    tips: List[str] = Field(default=[])
    tags: List[str] = Field(default=[], max_items=10)

    @field_validator('title', 'hook')
    @classmethod
    def sanitize_text(cls, v: str) -> str:
        """Sanitize text fields."""
        sanitized = re.sub(r'[<>]', '', v)
        return sanitized.strip()

    @field_validator('body')
    @classmethod
    def sanitize_body(cls, v: List[str]) -> List[str]:
        """Sanitize body sections."""
        return [
            re.sub(r'[<>]', '', section).strip()
            for section in v
            if section.strip()
        ]

    @field_validator('tags')
    @classmethod
    def sanitize_tags(cls, v: List[str]) -> List[str]:
        """Sanitize and normalize tags."""
        sanitized = []
        for tag in v[:10]:
            clean_tag = re.sub(r'[<>"\';]', '', tag).strip().lower()
            if clean_tag and len(clean_tag) <= 50:
                sanitized.append(clean_tag)
        return list(set(sanitized))


class ScriptUpdate(BaseModel):
    """Schema for updating a saved script."""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    hook: Optional[str] = Field(None, min_length=1, max_length=500)
    body: Optional[List[str]] = Field(None, min_items=1, max_items=20)
    call_to_action: Optional[str] = Field(None, max_length=500)
    tone: Optional[str] = Field(None, max_length=50)
    niche: Optional[str] = Field(None, max_length=100)
    duration_seconds: Optional[int] = Field(None, ge=10, le=180)
    language: Optional[str] = Field(None, max_length=10)
    viral_elements: Optional[List[str]] = None
    tips: Optional[List[str]] = None
    tags: Optional[List[str]] = Field(None, max_items=10)
    is_favorite: Optional[bool] = None


class ScriptResponse(BaseModel):
    """Response schema for saved script."""
    id: int
    user_id: int
    title: str
    hook: str
    body: List[str]
    call_to_action: Optional[str] = None
    source_trend_id: Optional[int] = None
    tone: str
    niche: Optional[str] = None
    duration_seconds: int
    language: str
    model_used: str
    viral_elements: List[str] = []
    tips: List[str] = []
    tags: List[str] = []
    is_favorite: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ScriptListResponse(BaseModel):
    """Paginated list of scripts."""
    items: List[ScriptResponse]
    total: int
    page: int = 1
    per_page: int = 20
    has_more: bool = False


# =============================================================================
# AI CHAT SCHEMAS
# =============================================================================

class ChatRequest(BaseModel):
    """Request for AI chat."""
    message: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="User message"
    )
    context: str = Field(
        default="",
        max_length=2000,
        description="Additional context (video description, etc.)"
    )
    history: List[Dict[str, str]] = Field(
        default=[],
        max_items=20,
        description="Conversation history"
    )
    model: str = Field(
        default="gemini",
        description="AI model: gemini, claude"
    )
    mode: str = Field(
        default="script",
        description="Chat mode: script, ideas, analysis, improve, hook"
    )
    session_id: Optional[str] = Field(
        None,
        max_length=100,
        description="Session ID for conversation continuity"
    )

    @field_validator('message', 'context')
    @classmethod
    def sanitize_text(cls, v: str) -> str:
        """Sanitize text input."""
        # Remove potentially dangerous characters but keep useful punctuation
        sanitized = re.sub(r'[<>]', '', v)
        return sanitized.strip()

    @field_validator('mode')
    @classmethod
    def validate_mode(cls, v: str) -> str:
        """Validate chat mode."""
        allowed = ['script', 'ideas', 'analysis', 'improve', 'hook']
        if v.lower() not in allowed:
            return 'script'
        return v.lower()


class ChatResponse(BaseModel):
    """Response from AI chat."""
    response: str = Field(..., description="AI response")
    session_id: Optional[str] = Field(None, description="Session ID")
    tokens_used: Optional[int] = Field(None, description="Tokens consumed")
    mode: Optional[str] = Field(None, description="Chat mode used")
