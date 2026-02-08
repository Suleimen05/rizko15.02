"""
Usage tracking schemas for AI credits and statistics.
Defines request/response models for the Usage page API.
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


class CreditsInfo(BaseModel):
    """AI Credits breakdown."""
    monthly_used: int = Field(..., description="Credits used this month")
    monthly_limit: int = Field(..., description="Monthly credit limit based on plan")
    bonus: int = Field(default=0, description="Bonus credits (never expire)")
    rollover: int = Field(default=0, description="Credits rolled over from previous month")
    total_available: int = Field(..., description="Total credits available (limit - used + bonus + rollover)")


class UsageStats(BaseModel):
    """User activity statistics for the current month."""
    scripts_generated: int = Field(default=0, description="AI scripts generated this month")
    chat_messages: int = Field(default=0, description="Chat messages sent this month")
    deep_analyze: int = Field(default=0, description="Deep analyze requests this month")


class AutoModeInfo(BaseModel):
    """Auto Mode configuration and savings."""
    enabled: bool = Field(..., description="Whether Auto Mode is enabled")
    savings: int = Field(default=0, description="Credits saved by using Auto Mode this month")


class UsageResponse(BaseModel):
    """Complete usage information for the Usage page."""
    plan: str = Field(..., description="Current subscription plan (free/creator/pro/agency)")
    reset_date: str = Field(..., description="Next credit reset date (YYYY-MM-DD)")
    credits: CreditsInfo
    stats: UsageStats
    auto_mode: AutoModeInfo

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "plan": "creator",
                "reset_date": "2026-02-28",
                "credits": {
                    "monthly_used": 253,
                    "monthly_limit": 500,
                    "bonus": 150,
                    "rollover": 12,
                    "total_available": 409
                },
                "stats": {
                    "scripts_generated": 23,
                    "chat_messages": 67,
                    "deep_analyze": 2
                },
                "auto_mode": {
                    "enabled": True,
                    "savings": 106
                }
            }
        }
    )


class AutoModeToggleRequest(BaseModel):
    """Request to toggle Auto Mode on/off."""
    enabled: bool = Field(..., description="New Auto Mode state")


class AutoModeToggleResponse(BaseModel):
    """Response after toggling Auto Mode."""
    enabled: bool = Field(..., description="Current Auto Mode state")
    message: str = Field(..., description="Success message")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "enabled": True,
                "message": "Auto Mode enabled successfully"
            }
        }
    )
