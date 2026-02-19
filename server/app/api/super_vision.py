"""
Super Vision API — Automated AI-curated video discovery.
Premium feature for PRO/AGENCY tiers.
"""
import logging
from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Depends, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..core.database import get_db
from ..api.dependencies import get_current_user, require_pro
from ..db.models import (
    User, Project, SuperVisionConfig, SuperVisionResult,
    SuperVisionStatus, SubscriptionTier
)

logger = logging.getLogger(__name__)
router = APIRouter()

# Tier limits for active configs
SV_TIER_LIMITS = {
    SubscriptionTier.FREE: 0,
    SubscriptionTier.CREATOR: 0,
    SubscriptionTier.PRO: 2,
    SubscriptionTier.AGENCY: 10,
}


# =============================================================================
# SCHEMAS
# =============================================================================

class SVConfigCreate(BaseModel):
    project_id: int
    min_views: int = Field(default=500000, ge=0)
    date_range_days: int = Field(default=7, ge=1, le=90)
    scan_interval_hours: int = Field(default=12, ge=8, le=168)
    max_vision_videos: int = Field(default=5, ge=1, le=10)
    custom_keywords: List[str] = Field(default_factory=list)
    text_score_threshold: int = Field(default=70, ge=0, le=100)


class SVConfigUpdate(BaseModel):
    min_views: Optional[int] = Field(default=None, ge=0)
    date_range_days: Optional[int] = Field(default=None, ge=1, le=90)
    scan_interval_hours: Optional[int] = Field(default=None, ge=8, le=168)
    max_vision_videos: Optional[int] = Field(default=None, ge=1, le=10)
    custom_keywords: Optional[List[str]] = None
    text_score_threshold: Optional[int] = Field(default=None, ge=0, le=100)


def _config_to_response(config: SuperVisionConfig) -> dict:
    return {
        "id": config.id,
        "project_id": config.project_id,
        "status": config.status.value if isinstance(config.status, SuperVisionStatus) else config.status,
        "min_views": config.min_views,
        "date_range_days": config.date_range_days,
        "platform": config.platform,
        "scan_interval_hours": config.scan_interval_hours,
        "max_vision_videos": config.max_vision_videos,
        "custom_keywords": config.custom_keywords or [],
        "text_score_threshold": config.text_score_threshold,
        "last_run_at": config.last_run_at.isoformat() if config.last_run_at else None,
        "next_run_at": config.next_run_at.isoformat() if config.next_run_at else None,
        "last_run_status": config.last_run_status,
        "last_run_stats": config.last_run_stats or {},
        "consecutive_errors": config.consecutive_errors,
        "last_error": config.last_error,
        "created_at": config.created_at.isoformat() if config.created_at else "",
        "updated_at": config.updated_at.isoformat() if config.updated_at else "",
    }


def _result_to_response(result: SuperVisionResult) -> dict:
    return {
        "id": result.id,
        "video_platform_id": result.video_platform_id,
        "video_url": result.video_url,
        "video_cover_url": result.video_cover_url,
        "video_play_addr": result.video_play_addr,
        "video_description": result.video_description,
        "video_author": result.video_author,
        "video_stats": result.video_stats or {},
        "text_score": result.text_score,
        "text_reason": result.text_reason,
        "vision_score": result.vision_score,
        "vision_analysis": result.vision_analysis,
        "vision_match_reason": result.vision_match_reason,
        "final_score": result.final_score,
        "scan_batch_id": result.scan_batch_id,
        "is_dismissed": result.is_dismissed,
        "is_saved": result.is_saved,
        "found_at": result.found_at.isoformat() if result.found_at else "",
    }


def _check_project_ownership(project_id: int, user: User, db: Session) -> Project:
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


# =============================================================================
# CONFIG ENDPOINTS
# =============================================================================

@router.get("/config/{project_id}")
async def get_config(
    project_id: int,
    current_user: User = Depends(require_pro),
    db: Session = Depends(get_db)
):
    """Get Super Vision config for a project."""
    _check_project_ownership(project_id, current_user, db)
    config = db.query(SuperVisionConfig).filter(
        SuperVisionConfig.project_id == project_id,
        SuperVisionConfig.user_id == current_user.id
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="Super Vision not configured for this project")
    return _config_to_response(config)


@router.post("/config")
async def create_config(
    data: SVConfigCreate,
    current_user: User = Depends(require_pro),
    db: Session = Depends(get_db)
):
    """Create Super Vision config for a project."""
    project = _check_project_ownership(data.project_id, current_user, db)

    # Check if config already exists
    existing = db.query(SuperVisionConfig).filter(
        SuperVisionConfig.project_id == data.project_id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Super Vision already configured for this project")

    # Check tier limits
    active_count = db.query(SuperVisionConfig).filter(
        SuperVisionConfig.user_id == current_user.id,
        SuperVisionConfig.status.in_([SuperVisionStatus.ACTIVE, SuperVisionStatus.PAUSED])
    ).count()
    max_allowed = SV_TIER_LIMITS.get(current_user.subscription_tier, 0)
    if active_count >= max_allowed:
        raise HTTPException(
            status_code=403,
            detail=f"Tier limit reached. Your plan allows {max_allowed} Super Vision configs."
        )

    config = SuperVisionConfig(
        user_id=current_user.id,
        project_id=data.project_id,
        status=SuperVisionStatus.PAUSED,
        min_views=data.min_views,
        date_range_days=data.date_range_days,
        scan_interval_hours=data.scan_interval_hours,
        max_vision_videos=data.max_vision_videos,
        custom_keywords=data.custom_keywords or [],
        text_score_threshold=data.text_score_threshold,
    )
    db.add(config)
    db.commit()
    db.refresh(config)

    logger.info(f"[SUPER VISION] Config created for project {data.project_id} by user {current_user.id}")
    return _config_to_response(config)


@router.patch("/config/{project_id}")
async def update_config(
    project_id: int,
    data: SVConfigUpdate,
    current_user: User = Depends(require_pro),
    db: Session = Depends(get_db)
):
    """Update Super Vision config filters."""
    _check_project_ownership(project_id, current_user, db)
    config = db.query(SuperVisionConfig).filter(
        SuperVisionConfig.project_id == project_id,
        SuperVisionConfig.user_id == current_user.id
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="Super Vision not configured for this project")

    if data.min_views is not None:
        config.min_views = data.min_views
    if data.date_range_days is not None:
        config.date_range_days = data.date_range_days
    if data.scan_interval_hours is not None:
        config.scan_interval_hours = data.scan_interval_hours
        # Reschedule if active
        if config.status == SuperVisionStatus.ACTIVE and config.scheduler_job_id:
            from ..services.super_vision_pipeline import schedule_super_vision_job
            next_run = datetime.utcnow() + timedelta(hours=data.scan_interval_hours)
            job_id = schedule_super_vision_job(config.id, next_run, data.scan_interval_hours)
            config.scheduler_job_id = job_id
            config.next_run_at = next_run
    if data.max_vision_videos is not None:
        config.max_vision_videos = data.max_vision_videos
    if data.custom_keywords is not None:
        config.custom_keywords = data.custom_keywords
    if data.text_score_threshold is not None:
        config.text_score_threshold = data.text_score_threshold

    config.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(config)
    return _config_to_response(config)


@router.delete("/config/{project_id}")
async def delete_config(
    project_id: int,
    current_user: User = Depends(require_pro),
    db: Session = Depends(get_db)
):
    """Delete Super Vision config and all results."""
    _check_project_ownership(project_id, current_user, db)
    config = db.query(SuperVisionConfig).filter(
        SuperVisionConfig.project_id == project_id,
        SuperVisionConfig.user_id == current_user.id
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="Super Vision not configured for this project")

    # Remove scheduler job
    if config.scheduler_job_id:
        from ..services.super_vision_pipeline import remove_super_vision_job
        remove_super_vision_job(config.scheduler_job_id)

    db.delete(config)  # cascade deletes results
    db.commit()
    return {"message": "Super Vision config deleted"}


@router.post("/config/{project_id}/activate")
async def activate_config(
    project_id: int,
    current_user: User = Depends(require_pro),
    db: Session = Depends(get_db)
):
    """Activate Super Vision (start scheduled scans)."""
    _check_project_ownership(project_id, current_user, db)
    config = db.query(SuperVisionConfig).filter(
        SuperVisionConfig.project_id == project_id,
        SuperVisionConfig.user_id == current_user.id
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="Super Vision not configured for this project")

    if config.status == SuperVisionStatus.ACTIVE:
        return _config_to_response(config)

    # Schedule recurring job
    from ..services.super_vision_pipeline import schedule_super_vision_job
    next_run = datetime.utcnow() + timedelta(minutes=1)  # first run in 1 min
    job_id = schedule_super_vision_job(config.id, next_run, config.scan_interval_hours)

    config.status = SuperVisionStatus.ACTIVE
    config.scheduler_job_id = job_id
    config.next_run_at = next_run
    config.consecutive_errors = 0
    config.last_error = None
    config.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(config)

    logger.info(f"[SUPER VISION] Activated for project {project_id}")
    return _config_to_response(config)


@router.post("/config/{project_id}/pause")
async def pause_config(
    project_id: int,
    current_user: User = Depends(require_pro),
    db: Session = Depends(get_db)
):
    """Pause Super Vision (stop scheduled scans)."""
    _check_project_ownership(project_id, current_user, db)
    config = db.query(SuperVisionConfig).filter(
        SuperVisionConfig.project_id == project_id,
        SuperVisionConfig.user_id == current_user.id
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="Super Vision not configured for this project")

    if config.scheduler_job_id:
        from ..services.super_vision_pipeline import remove_super_vision_job
        remove_super_vision_job(config.scheduler_job_id)

    config.status = SuperVisionStatus.PAUSED
    config.scheduler_job_id = None
    config.next_run_at = None
    config.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(config)

    logger.info(f"[SUPER VISION] Paused for project {project_id}")
    return _config_to_response(config)


@router.post("/config/{project_id}/trigger")
async def trigger_scan(
    project_id: int,
    current_user: User = Depends(require_pro),
    db: Session = Depends(get_db)
):
    """Manually trigger a Super Vision scan (run now)."""
    _check_project_ownership(project_id, current_user, db)
    config = db.query(SuperVisionConfig).filter(
        SuperVisionConfig.project_id == project_id,
        SuperVisionConfig.user_id == current_user.id
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="Super Vision not configured for this project")

    # Check credits
    total_credits = (current_user.credits or 0) + (current_user.rollover_credits or 0) + (current_user.bonus_credits or 0)
    if total_credits < 20:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Insufficient credits. Need at least 20, have {total_credits}"
        )

    # Run synchronously in background thread
    import threading
    from ..services.super_vision_pipeline import run_super_vision_scan

    thread = threading.Thread(target=run_super_vision_scan, args=(config.id,))
    thread.start()

    return {"message": "Super Vision scan triggered. Results will appear shortly."}


# =============================================================================
# RESULTS ENDPOINTS
# =============================================================================

@router.get("/results/{project_id}")
async def get_results(
    project_id: int,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=50),
    sort_by: str = Query(default="final_score"),
    include_dismissed: bool = Query(default=False),
    current_user: User = Depends(require_pro),
    db: Session = Depends(get_db)
):
    """Get Super Vision results for a project (paginated)."""
    _check_project_ownership(project_id, current_user, db)

    query = db.query(SuperVisionResult).filter(
        SuperVisionResult.project_id == project_id,
        SuperVisionResult.user_id == current_user.id
    )

    if not include_dismissed:
        query = query.filter(SuperVisionResult.is_dismissed == False)

    # Sorting
    if sort_by == "vision_score":
        query = query.order_by(desc(SuperVisionResult.vision_score))
    elif sort_by == "found_at":
        query = query.order_by(desc(SuperVisionResult.found_at))
    else:
        query = query.order_by(desc(SuperVisionResult.final_score))

    total = query.count()
    results = query.offset((page - 1) * per_page).limit(per_page).all()

    return {
        "items": [_result_to_response(r) for r in results],
        "total": total,
        "page": page,
        "per_page": per_page,
        "has_more": total > page * per_page,
    }


@router.post("/results/{result_id}/dismiss")
async def dismiss_result(
    result_id: int,
    current_user: User = Depends(require_pro),
    db: Session = Depends(get_db)
):
    """Dismiss a Super Vision result."""
    result = db.query(SuperVisionResult).filter(
        SuperVisionResult.id == result_id,
        SuperVisionResult.user_id == current_user.id
    ).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")

    result.is_dismissed = True
    db.commit()
    return {"message": "Result dismissed"}


@router.post("/results/{result_id}/save")
async def save_result(
    result_id: int,
    current_user: User = Depends(require_pro),
    db: Session = Depends(get_db)
):
    """Mark a Super Vision result as saved (adds to favorites too)."""
    result = db.query(SuperVisionResult).filter(
        SuperVisionResult.id == result_id,
        SuperVisionResult.user_id == current_user.id
    ).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")

    result.is_saved = True
    db.commit()
    return {"message": "Result saved"}


@router.delete("/results/{project_id}/clear")
async def clear_results(
    project_id: int,
    current_user: User = Depends(require_pro),
    db: Session = Depends(get_db)
):
    """Clear all results for a project."""
    _check_project_ownership(project_id, current_user, db)

    deleted = db.query(SuperVisionResult).filter(
        SuperVisionResult.project_id == project_id,
        SuperVisionResult.user_id == current_user.id
    ).delete()
    db.commit()
    return {"message": f"Cleared {deleted} results"}


# =============================================================================
# STATUS OVERVIEW
# =============================================================================

@router.get("/status")
async def get_all_configs(
    current_user: User = Depends(require_pro),
    db: Session = Depends(get_db)
):
    """Get all Super Vision configs for the user (overview)."""
    configs = db.query(SuperVisionConfig).filter(
        SuperVisionConfig.user_id == current_user.id
    ).all()

    result = []
    for config in configs:
        project = db.query(Project).filter(Project.id == config.project_id).first()
        config_data = _config_to_response(config)
        config_data["project_name"] = project.name if project else "Unknown"
        config_data["project_icon"] = project.icon if project else None
        results_count = db.query(SuperVisionResult).filter(
            SuperVisionResult.config_id == config.id,
            SuperVisionResult.is_dismissed == False
        ).count()
        config_data["results_count"] = results_count
        result.append(config_data)

    return result
