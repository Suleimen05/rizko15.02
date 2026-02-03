"""
Feedback API Routes
Handles user feedback submission, retrieval, and management.
"""
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime

from ...core.database import get_db
from ...api.dependencies import get_current_user, get_current_user_optional
from ...db.models import Feedback, User

router = APIRouter(prefix="/feedback", tags=["Feedback"])


# =============================================================================
# SCHEMAS
# =============================================================================

class FeedbackCreate(BaseModel):
    feedback_type: str  # 'idea', 'bug', 'love', 'other'
    message: str
    rating: Optional[int] = None


class FeedbackResponse(BaseModel):
    id: int
    feedback_type: str
    message: str
    rating: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class FeedbackAdminUpdate(BaseModel):
    is_read: Optional[bool] = None
    admin_notes: Optional[str] = None


# =============================================================================
# PUBLIC ENDPOINTS
# =============================================================================

@router.post("/", response_model=dict)
async def submit_feedback(
    data: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """
    Submit feedback. Works for both authenticated and anonymous users.
    """
    # Validate rating
    if data.rating is not None and not (1 <= data.rating <= 5):
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    # Validate message length
    if len(data.message.strip()) < 10:
        raise HTTPException(status_code=400, detail="Message must be at least 10 characters")

    if len(data.message) > 10000:
        raise HTTPException(status_code=400, detail="Message too long (max 10000 characters)")

    # Create feedback entry
    feedback = Feedback(
        user_id=current_user.id if current_user else None,
        user_email=current_user.email if current_user else None,
        feedback_type=data.feedback_type,
        message=data.message.strip(),
        rating=data.rating,
        is_read=False
    )

    db.add(feedback)
    db.commit()
    db.refresh(feedback)

    return {
        "success": True,
        "message": "Thank you for your feedback!",
        "feedback_id": feedback.id
    }


# =============================================================================
# AUTHENTICATED ENDPOINTS
# =============================================================================

@router.get("/my", response_model=list[FeedbackResponse])
async def get_my_feedback(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get feedback history for the current user.
    """
    feedback_items = db.query(Feedback).filter(
        Feedback.user_id == current_user.id
    ).order_by(Feedback.created_at.desc()).all()

    return feedback_items


# =============================================================================
# ADMIN ENDPOINTS
# =============================================================================

@router.get("/admin/all", response_model=list[dict])
async def get_all_feedback(
    feedback_type: Optional[str] = Query(None, description="Filter by type"),
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all feedback (admin only).
    """
    # Check if user is admin
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    query = db.query(Feedback)

    if feedback_type:
        query = query.filter(Feedback.feedback_type == feedback_type)

    if is_read is not None:
        query = query.filter(Feedback.is_read == is_read)

    feedback_items = query.order_by(
        Feedback.created_at.desc()
    ).offset(offset).limit(limit).all()

    result = []
    for item in feedback_items:
        result.append({
            "id": item.id,
            "feedback_type": item.feedback_type,
            "message": item.message,
            "rating": item.rating,
            "user_email": item.user_email,
            "user_id": item.user_id,
            "is_read": item.is_read,
            "admin_notes": item.admin_notes,
            "created_at": item.created_at.isoformat(),
            "updated_at": item.updated_at.isoformat()
        })

    return result


@router.patch("/admin/{feedback_id}", response_model=dict)
async def update_feedback(
    feedback_id: int,
    data: FeedbackAdminUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update feedback (mark as read, add notes) - admin only.
    """
    # Check if user is admin
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")

    if data.is_read is not None:
        feedback.is_read = data.is_read

    if data.admin_notes is not None:
        feedback.admin_notes = data.admin_notes

    db.commit()
    db.refresh(feedback)

    return {
        "success": True,
        "message": "Feedback updated",
        "feedback_id": feedback.id
    }


@router.delete("/admin/{feedback_id}", response_model=dict)
async def delete_feedback(
    feedback_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete feedback - admin only.
    """
    # Check if user is admin
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")

    db.delete(feedback)
    db.commit()

    return {
        "success": True,
        "message": "Feedback deleted"
    }


@router.get("/admin/stats", response_model=dict)
async def get_feedback_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get feedback statistics - admin only.
    """
    # Check if user is admin
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    total = db.query(Feedback).count()
    unread = db.query(Feedback).filter(Feedback.is_read == False).count()

    by_type = {}
    for ftype in ['idea', 'bug', 'love', 'other']:
        count = db.query(Feedback).filter(Feedback.feedback_type == ftype).count()
        by_type[ftype] = count

    # Average rating
    from sqlalchemy import func
    avg_rating = db.query(func.avg(Feedback.rating)).filter(
        Feedback.rating.isnot(None)
    ).scalar()

    return {
        "total": total,
        "unread": unread,
        "by_type": by_type,
        "average_rating": round(avg_rating, 2) if avg_rating else None
    }
