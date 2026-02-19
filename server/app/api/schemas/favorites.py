"""
Pydantic schemas for User Favorites (Bookmarks).

Allows users to save and organize interesting trends.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator
import re


# =============================================================================
# REQUEST SCHEMAS
# =============================================================================

class FavoriteCreate(BaseModel):
    """Schema for adding a trend to favorites."""
    trend_id: int = Field(..., gt=0, description="ID of the trend to favorite")
    notes: Optional[str] = Field(
        None,
        max_length=1000,
        description="Personal notes about this trend"
    )
    tags: List[str] = Field(
        default=[],
        max_items=10,
        description="Custom tags for organization"
    )
    project_id: Optional[int] = Field(
        default=None,
        description="Project ID to bind favorite to"
    )

    @field_validator('notes')
    @classmethod
    def sanitize_notes(cls, v: Optional[str]) -> Optional[str]:
        """Sanitize notes to prevent XSS."""
        if v is None:
            return v
        sanitized = re.sub(r'[<>]', '', v)
        return sanitized.strip()

    @field_validator('tags')
    @classmethod
    def sanitize_tags(cls, v: List[str]) -> List[str]:
        """Sanitize and normalize tags."""
        sanitized = []
        for tag in v[:10]:  # Limit to 10 tags
            clean_tag = re.sub(r'[<>"\';]', '', tag).strip().lower()
            if clean_tag and len(clean_tag) <= 50:
                sanitized.append(clean_tag)
        return list(set(sanitized))  # Remove duplicates


class FavoriteUpdate(BaseModel):
    """Schema for updating a favorite."""
    notes: Optional[str] = Field(
        None,
        max_length=1000,
        description="Updated notes"
    )
    tags: Optional[List[str]] = Field(
        None,
        max_items=10,
        description="Updated tags"
    )

    @field_validator('notes')
    @classmethod
    def sanitize_notes(cls, v: Optional[str]) -> Optional[str]:
        """Sanitize notes."""
        if v is None:
            return v
        sanitized = re.sub(r'[<>]', '', v)
        return sanitized.strip()

    @field_validator('tags')
    @classmethod
    def sanitize_tags(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        """Sanitize tags."""
        if v is None:
            return v
        sanitized = []
        for tag in v[:10]:
            clean_tag = re.sub(r'[<>"\';]', '', tag).strip().lower()
            if clean_tag and len(clean_tag) <= 50:
                sanitized.append(clean_tag)
        return list(set(sanitized))


# =============================================================================
# RESPONSE SCHEMAS
# =============================================================================

class TrendSummary(BaseModel):
    """Minimal trend info for favorite response."""
    id: int
    platform_id: Optional[str] = None
    url: Optional[str] = None
    play_addr: Optional[str] = None  # Direct CDN video URL for inline playback
    description: Optional[str] = None
    cover_url: Optional[str] = None
    author_username: Optional[str] = None
    uts_score: float = 0.0
    stats: dict = {}

    model_config = {"from_attributes": True}


class FavoriteResponse(BaseModel):
    """Schema for favorite response."""
    id: int
    user_id: int
    trend_id: int
    notes: Optional[str] = None
    tags: List[str] = []
    project_id: Optional[int] = None
    created_at: datetime

    # Include trend data
    trend: Optional[TrendSummary] = None

    model_config = {"from_attributes": True}


class FavoriteListResponse(BaseModel):
    """Paginated list of favorites."""
    items: List[FavoriteResponse]
    total: int
    page: int = 1
    per_page: int = 20
    has_more: bool = False


# =============================================================================
# BULK OPERATIONS
# =============================================================================

class BulkFavoriteCreate(BaseModel):
    """Schema for bulk adding favorites."""
    trend_ids: List[int] = Field(
        ...,
        min_items=1,
        max_items=50,
        description="List of trend IDs to favorite"
    )
    tags: List[str] = Field(
        default=[],
        max_items=10,
        description="Tags to apply to all"
    )


class BulkFavoriteDelete(BaseModel):
    """Schema for bulk removing favorites."""
    favorite_ids: List[int] = Field(
        ...,
        min_items=1,
        max_items=50,
        description="List of favorite IDs to remove"
    )


class BulkOperationResult(BaseModel):
    """Result of bulk operation."""
    success_count: int
    failed_count: int
    errors: List[str] = []
