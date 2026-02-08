"""
Usage tracking routes for AI credits and statistics.
Provides endpoints for the Usage page in Settings.

NOTE: This is a beta/MVP implementation with mock data.
Real AI usage tracking will be implemented when AI models are integrated.
"""
import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, extract

from ...core.database import get_db
from ...db.models import User, UserSettings, UserScript, ChatMessage
from ..schemas.usage import (
    UsageResponse,
    CreditsInfo,
    UsageStats,
    AutoModeInfo,
    AutoModeToggleRequest,
    AutoModeToggleResponse
)
from ..dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/usage", tags=["Usage"])


# =============================================================================
# PLAN-BASED CREDIT LIMITS
# =============================================================================

PLAN_CREDITS = {
    "free": 100,
    "creator": 500,
    "pro": 2000,
    "agency": 10000
}


def get_next_reset_date() -> str:
    """
    Calculate the next credit reset date (1st of next month).

    Returns:
        ISO format date string (YYYY-MM-DD)
    """
    now = datetime.utcnow()

    # Get first day of next month
    if now.month == 12:
        next_month = datetime(now.year + 1, 1, 1)
    else:
        next_month = datetime(now.year, now.month + 1, 1)

    return next_month.strftime("%Y-%m-%d")


@router.get("", response_model=UsageResponse)
async def get_usage_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive usage statistics for the current user.

    Returns:
    - Current plan and credit limits
    - Credits used/remaining (monthly, bonus, rollover)
    - Activity statistics (scripts, messages, deep analyze)
    - Auto Mode status and savings

    NOTE: Beta version with mock data for bonus/rollover credits and savings.
    Real tracking will be implemented with AI model integration.
    """
    try:
        # Get user settings (for auto_mode - will be added to DB later)
        settings = db.query(UserSettings).filter(
            UserSettings.user_id == current_user.id
        ).first()

        if not settings:
            # Create default settings if not exist
            settings = UserSettings(user_id=current_user.id)
            db.add(settings)
            db.commit()
            db.refresh(settings)

        # Get plan-based credit limit (from DB)
        plan = current_user.subscription_tier.value
        monthly_limit = current_user.monthly_credits_limit
        monthly_used = current_user.monthly_credits_used

        # Get bonus and rollover credits from DB
        bonus_credits = current_user.bonus_credits
        rollover_credits = current_user.rollover_credits

        # Total available = (monthly limit - used) + bonus + rollover
        monthly_remaining = max(0, monthly_limit - monthly_used)
        total_available = monthly_remaining + bonus_credits + rollover_credits

        # Get current month stats (optimized - single query with subqueries)
        now = datetime.utcnow()
        month_start = datetime(now.year, now.month, 1)

        # Query both counts in parallel (more efficient than separate queries)
        scripts_count = db.query(func.count(UserScript.id)).filter(
            UserScript.user_id == current_user.id,
            UserScript.created_at >= month_start
        ).scalar() or 0

        messages_count = db.query(func.count(ChatMessage.id)).filter(
            ChatMessage.user_id == current_user.id,
            ChatMessage.created_at >= month_start
        ).scalar() or 0

        # Deep analyze count (mock for beta - will track separately)
        deep_analyze_count = 2 if plan in ["pro", "agency"] else 0

        # Auto Mode settings (from DB)
        auto_mode_enabled = settings.ai_auto_mode if settings else True

        # Calculate savings (mock calculation)
        # Real calculation: count times auto-mode chose cheaper model
        savings = int(scripts_count * 4.5) if auto_mode_enabled else 0

        return UsageResponse(
            plan=plan,
            reset_date=get_next_reset_date(),
            credits=CreditsInfo(
                monthly_used=monthly_used,
                monthly_limit=monthly_limit,
                bonus=bonus_credits,
                rollover=rollover_credits,
                total_available=total_available
            ),
            stats=UsageStats(
                scripts_generated=scripts_count,
                chat_messages=messages_count,
                deep_analyze=deep_analyze_count
            ),
            auto_mode=AutoModeInfo(
                enabled=auto_mode_enabled,
                savings=savings
            )
        )

    except Exception as e:
        logger.error(f"Error fetching usage stats for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch usage statistics: {str(e)}"
        )


@router.post("/auto-mode", response_model=AutoModeToggleResponse)
async def toggle_auto_mode(
    request: AutoModeToggleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Toggle Auto Mode for AI model selection.

    Auto Mode automatically selects the most cost-effective AI model
    based on task complexity:
    - Simple tasks: Gemini Flash (0 credits)
    - Complex tasks: Gemini Pro (3 credits)

    Args:
        request: New Auto Mode state (enabled/disabled)

    Returns:
        Updated Auto Mode status and confirmation message

    NOTE: Beta version - setting will be stored in UserSettings.
    Database migration needed to add auto_mode field.
    """
    try:
        # Check plan eligibility (Free tier doesn't have Auto Mode)
        if current_user.subscription_tier.value == "free":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Auto Mode is only available for Creator, Pro, and Agency plans"
            )

        # Get or create user settings
        settings = db.query(UserSettings).filter(
            UserSettings.user_id == current_user.id
        ).first()

        if not settings:
            settings = UserSettings(user_id=current_user.id)
            db.add(settings)

        # Update auto_mode in database
        settings.ai_auto_mode = request.enabled
        db.commit()

        message = "Auto Mode enabled successfully" if request.enabled else "Auto Mode disabled successfully"

        logger.info(
            f"User {current_user.id} {'enabled' if request.enabled else 'disabled'} Auto Mode"
        )

        return AutoModeToggleResponse(
            enabled=request.enabled,
            message=message
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling auto mode for user {current_user.id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to toggle Auto Mode: {str(e)}"
        )
