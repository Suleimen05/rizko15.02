"""
Pydantic schemas for authentication endpoints.

Security-first validation with:
- Strong password requirements
- Email validation
- Input sanitization
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, field_validator
import re


# =============================================================================
# USER REGISTRATION & LOGIN
# =============================================================================

class UserRegister(BaseModel):
    """Schema for user registration request."""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(
        ...,
        min_length=8,
        max_length=100,
        description="Password (8+ chars, must include letter and number)"
    )
    full_name: Optional[str] = Field(
        None,
        max_length=100,
        description="User's full name"
    )

    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """
        Enforce password complexity requirements.

        Requirements:
        - At least 8 characters
        - At least one letter
        - At least one digit
        - No common weak passwords
        """
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')

        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one digit')

        if not any(char.isalpha() for char in v):
            raise ValueError('Password must contain at least one letter')

        # Check for common weak passwords
        weak_passwords = [
            'password', '12345678', 'qwerty12', 'letmein1',
            'welcome1', 'admin123', 'abc12345'
        ]
        if v.lower() in weak_passwords:
            raise ValueError('Password is too common, please choose a stronger one')

        return v

    @field_validator('full_name')
    @classmethod
    def sanitize_name(cls, v: Optional[str]) -> Optional[str]:
        """Sanitize full name to prevent injection."""
        if v is None:
            return v
        # Remove potentially dangerous characters
        sanitized = re.sub(r'[<>"\']', '', v)
        return sanitized.strip()


class UserLogin(BaseModel):
    """Schema for user login request."""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")


class GoogleOAuthRequest(BaseModel):
    """Schema for Google OAuth callback."""
    code: str = Field(..., description="OAuth authorization code")
    redirect_uri: Optional[str] = Field(None, description="OAuth redirect URI")


# =============================================================================
# TOKEN SCHEMAS
# =============================================================================

class Token(BaseModel):
    """Schema for token response."""
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(default=1800, description="Token expiration in seconds")


class TokenRefresh(BaseModel):
    """Schema for token refresh request."""
    refresh_token: str = Field(..., description="JWT refresh token")


# =============================================================================
# USER RESPONSE SCHEMAS
# =============================================================================

class UserBase(BaseModel):
    """Base user schema with common fields."""
    email: EmailStr
    full_name: Optional[str] = None


class UserResponse(UserBase):
    """Schema for user data in responses."""
    id: int
    subscription_tier: str
    credits: int
    is_active: bool
    is_verified: bool
    avatar_url: Optional[str] = None
    created_at: datetime
    last_login_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class UserPublicProfile(BaseModel):
    """Public user profile (limited data)."""
    id: int
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

    model_config = {"from_attributes": True}


# =============================================================================
# USER SETTINGS SCHEMAS
# =============================================================================

class UserSettingsBase(BaseModel):
    """Base settings schema."""
    dark_mode: bool = False
    language: str = Field(default="en", max_length=10)
    region: str = Field(default="US", max_length=10)
    timezone: str = Field(default="UTC", max_length=50)
    auto_generate_scripts: bool = True
    notifications_email: bool = True
    notifications_trends: bool = True
    notifications_competitors: bool = True
    notifications_new_videos: bool = False
    notifications_weekly_report: bool = True


class UserSettingsUpdate(BaseModel):
    """Schema for updating user settings (all fields optional)."""
    dark_mode: Optional[bool] = None
    language: Optional[str] = Field(None, max_length=10)
    region: Optional[str] = Field(None, max_length=10)
    timezone: Optional[str] = Field(None, max_length=50)
    auto_generate_scripts: Optional[bool] = None
    notifications_email: Optional[bool] = None
    notifications_trends: Optional[bool] = None
    notifications_competitors: Optional[bool] = None
    notifications_new_videos: Optional[bool] = None
    notifications_weekly_report: Optional[bool] = None


class UserSettingsResponse(UserSettingsBase):
    """Schema for settings response."""
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# =============================================================================
# COMBINED AUTH RESPONSE
# =============================================================================

class AuthResponse(BaseModel):
    """Complete authentication response with user data and tokens."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 1800
    user: UserResponse


class MeResponse(BaseModel):
    """Response for /auth/me endpoint."""
    user: UserResponse
    settings: Optional[UserSettingsResponse] = None
    limits: Optional[dict] = None


# =============================================================================
# PASSWORD MANAGEMENT
# =============================================================================

class PasswordChange(BaseModel):
    """Schema for password change request."""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(
        ...,
        min_length=8,
        max_length=100,
        description="New password"
    )

    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        """Validate new password strength."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one digit')
        if not any(char.isalpha() for char in v):
            raise ValueError('Password must contain at least one letter')
        return v


class PasswordReset(BaseModel):
    """Schema for password reset request."""
    email: EmailStr = Field(..., description="Email address for password reset")


class PasswordResetConfirm(BaseModel):
    """Schema for password reset confirmation."""
    token: str = Field(..., description="Password reset token")
    new_password: str = Field(
        ...,
        min_length=8,
        max_length=100,
        description="New password"
    )

    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        """Validate new password strength."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one digit')
        if not any(char.isalpha() for char in v):
            raise ValueError('Password must contain at least one letter')
        return v
