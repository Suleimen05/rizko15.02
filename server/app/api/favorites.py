# backend/app/api/favorites.py
"""
User Favorites (Bookmarks) API.

Allows users to save and organize interesting trends.
Full CRUD operations with user isolation.
"""
import logging
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from ..core.database import get_db
from ..db.models import User, Trend, UserFavorite
from .dependencies import get_current_user, check_rate_limit
from .schemas.favorites import (
    FavoriteCreate,
    FavoriteUpdate,
    FavoriteResponse,
    FavoriteListResponse,
    TrendSummary,
    BulkFavoriteCreate,
    BulkFavoriteDelete,
    BulkOperationResult
)

logger = logging.getLogger(__name__)

router = APIRouter()


# =============================================================================
# CRUD OPERATIONS
# =============================================================================

@router.get("/", response_model=FavoriteListResponse)
def get_favorites(
    page: int = 1,
    per_page: int = 20,
    tag: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get paginated list of user's favorites.

    User Isolation: Only returns favorites belonging to the authenticated user.
    """
    query = db.query(UserFavorite).filter(
        UserFavorite.user_id == current_user.id
    ).options(joinedload(UserFavorite.trend))

    # Filter by tag if provided
    if tag:
        query = query.filter(UserFavorite.tags.contains([tag.lower()]))

    total = query.count()
    offset = (page - 1) * per_page

    favorites = query.order_by(
        UserFavorite.created_at.desc()
    ).offset(offset).limit(per_page).all()

    items = []
    for fav in favorites:
        trend_summary = None
        if fav.trend:
            trend_summary = TrendSummary(
                id=fav.trend.id,
                platform_id=fav.trend.platform_id,
                url=fav.trend.url,
                description=fav.trend.description,
                cover_url=fav.trend.cover_url,
                author_username=fav.trend.author_username,
                uts_score=fav.trend.uts_score or 0.0,
                stats=fav.trend.stats or {}
            )

        items.append(FavoriteResponse(
            id=fav.id,
            user_id=fav.user_id,
            trend_id=fav.trend_id,
            notes=fav.notes,
            tags=fav.tags or [],
            created_at=fav.created_at,
            trend=trend_summary
        ))

    return FavoriteListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        has_more=(offset + len(favorites)) < total
    )


@router.post("/", response_model=FavoriteResponse, status_code=status.HTTP_201_CREATED)
def add_favorite(
    data: FavoriteCreate,
    current_user: User = Depends(check_rate_limit),
    db: Session = Depends(get_db)
):
    """
    Add a trend to user's favorites.

    User Isolation: Favorite is linked to authenticated user only.
    Prevents duplicates: Same trend can only be favorited once per user.
    """
    # Check if trend exists (user can favorite any trend they can see)
    trend = db.query(Trend).filter(Trend.id == data.trend_id).first()

    if not trend:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trend not found"
        )

    # Check if already favorited
    existing = db.query(UserFavorite).filter(
        UserFavorite.user_id == current_user.id,
        UserFavorite.trend_id == data.trend_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Trend already in favorites"
        )

    # Create favorite
    favorite = UserFavorite(
        user_id=current_user.id,
        trend_id=data.trend_id,
        notes=data.notes,
        tags=data.tags or []
    )

    db.add(favorite)
    db.commit()
    db.refresh(favorite)

    logger.info(f"⭐ User {current_user.id} favorited trend {data.trend_id}")

    # Build response with trend data
    trend_summary = TrendSummary(
        id=trend.id,
        platform_id=trend.platform_id,
        url=trend.url,
        description=trend.description,
        cover_url=trend.cover_url,
        author_username=trend.author_username,
        uts_score=trend.uts_score or 0.0,
        stats=trend.stats or {}
    )

    return FavoriteResponse(
        id=favorite.id,
        user_id=favorite.user_id,
        trend_id=favorite.trend_id,
        notes=favorite.notes,
        tags=favorite.tags or [],
        created_at=favorite.created_at,
        trend=trend_summary
    )


@router.get("/{favorite_id}", response_model=FavoriteResponse)
def get_favorite(
    favorite_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific favorite by ID.

    User Isolation: Only returns if favorite belongs to authenticated user.
    """
    favorite = db.query(UserFavorite).filter(
        UserFavorite.id == favorite_id,
        UserFavorite.user_id == current_user.id
    ).options(joinedload(UserFavorite.trend)).first()

    if not favorite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorite not found"
        )

    trend_summary = None
    if favorite.trend:
        trend_summary = TrendSummary(
            id=favorite.trend.id,
            platform_id=favorite.trend.platform_id,
            url=favorite.trend.url,
            description=favorite.trend.description,
            cover_url=favorite.trend.cover_url,
            author_username=favorite.trend.author_username,
            uts_score=favorite.trend.uts_score or 0.0,
            stats=favorite.trend.stats or {}
        )

    return FavoriteResponse(
        id=favorite.id,
        user_id=favorite.user_id,
        trend_id=favorite.trend_id,
        notes=favorite.notes,
        tags=favorite.tags or [],
        created_at=favorite.created_at,
        trend=trend_summary
    )


@router.patch("/{favorite_id}", response_model=FavoriteResponse)
def update_favorite(
    favorite_id: int,
    data: FavoriteUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a favorite's notes or tags.

    User Isolation: Only updates if favorite belongs to authenticated user.
    """
    favorite = db.query(UserFavorite).filter(
        UserFavorite.id == favorite_id,
        UserFavorite.user_id == current_user.id
    ).options(joinedload(UserFavorite.trend)).first()

    if not favorite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorite not found"
        )

    # Update fields if provided
    if data.notes is not None:
        favorite.notes = data.notes
    if data.tags is not None:
        favorite.tags = data.tags

    db.commit()
    db.refresh(favorite)

    logger.info(f"📝 User {current_user.id} updated favorite {favorite_id}")

    trend_summary = None
    if favorite.trend:
        trend_summary = TrendSummary(
            id=favorite.trend.id,
            platform_id=favorite.trend.platform_id,
            url=favorite.trend.url,
            description=favorite.trend.description,
            cover_url=favorite.trend.cover_url,
            author_username=favorite.trend.author_username,
            uts_score=favorite.trend.uts_score or 0.0,
            stats=favorite.trend.stats or {}
        )

    return FavoriteResponse(
        id=favorite.id,
        user_id=favorite.user_id,
        trend_id=favorite.trend_id,
        notes=favorite.notes,
        tags=favorite.tags or [],
        created_at=favorite.created_at,
        trend=trend_summary
    )


@router.delete("/{favorite_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_favorite(
    favorite_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove a trend from favorites.

    User Isolation: Only deletes if favorite belongs to authenticated user.
    """
    favorite = db.query(UserFavorite).filter(
        UserFavorite.id == favorite_id,
        UserFavorite.user_id == current_user.id
    ).first()

    if not favorite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorite not found"
        )

    db.delete(favorite)
    db.commit()

    logger.info(f"🗑️ User {current_user.id} removed favorite {favorite_id}")


# =============================================================================
# BULK OPERATIONS
# =============================================================================

@router.post("/bulk", response_model=BulkOperationResult)
def bulk_add_favorites(
    data: BulkFavoriteCreate,
    current_user: User = Depends(check_rate_limit),
    db: Session = Depends(get_db)
):
    """
    Add multiple trends to favorites at once.

    User Isolation: All trends must belong to authenticated user.
    """
    success_count = 0
    failed_count = 0
    errors = []

    for trend_id in data.trend_ids:
        # Check if trend exists (user can favorite any trend they can see)
        trend = db.query(Trend).filter(Trend.id == trend_id).first()

        if not trend:
            failed_count += 1
            errors.append(f"Trend {trend_id} not found")
            continue

        # Check if already favorited
        existing = db.query(UserFavorite).filter(
            UserFavorite.user_id == current_user.id,
            UserFavorite.trend_id == trend_id
        ).first()

        if existing:
            failed_count += 1
            errors.append(f"Trend {trend_id} already in favorites")
            continue

        # Create favorite
        favorite = UserFavorite(
            user_id=current_user.id,
            trend_id=trend_id,
            tags=data.tags or []
        )
        db.add(favorite)
        success_count += 1

    db.commit()

    logger.info(f"⭐ User {current_user.id} bulk added {success_count} favorites")

    return BulkOperationResult(
        success_count=success_count,
        failed_count=failed_count,
        errors=errors[:10]  # Limit errors in response
    )


@router.delete("/bulk", response_model=BulkOperationResult)
def bulk_delete_favorites(
    data: BulkFavoriteDelete,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove multiple favorites at once.

    User Isolation: Only deletes favorites belonging to authenticated user.
    """
    success_count = 0
    failed_count = 0
    errors = []

    for favorite_id in data.favorite_ids:
        favorite = db.query(UserFavorite).filter(
            UserFavorite.id == favorite_id,
            UserFavorite.user_id == current_user.id
        ).first()

        if not favorite:
            failed_count += 1
            errors.append(f"Favorite {favorite_id} not found")
            continue

        db.delete(favorite)
        success_count += 1

    db.commit()

    logger.info(f"🗑️ User {current_user.id} bulk removed {success_count} favorites")

    return BulkOperationResult(
        success_count=success_count,
        failed_count=failed_count,
        errors=errors[:10]
    )


# =============================================================================
# UTILITY ENDPOINTS
# =============================================================================

@router.get("/tags/all", response_model=List[str])
def get_all_tags(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all unique tags used by the user in favorites.
    """
    favorites = db.query(UserFavorite).filter(
        UserFavorite.user_id == current_user.id
    ).all()

    all_tags = set()
    for fav in favorites:
        if fav.tags:
            all_tags.update(fav.tags)

    return sorted(list(all_tags))


@router.get("/check/{trend_id}")
def check_if_favorited(
    trend_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check if a specific trend is in user's favorites.
    """
    favorite = db.query(UserFavorite).filter(
        UserFavorite.user_id == current_user.id,
        UserFavorite.trend_id == trend_id
    ).first()

    return {
        "is_favorited": favorite is not None,
        "favorite_id": favorite.id if favorite else None
    }
