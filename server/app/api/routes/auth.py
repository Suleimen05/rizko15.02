"""
Authentication routes for user registration, login, and token management.
Production-ready implementation with proper error handling and security.
"""
import os
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ...core.database import get_db
from ...core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token
)
from ...db.models import User, UserSettings
from ..schemas.auth import (
    UserRegister,
    UserLogin,
    AuthResponse,
    UserResponse,
    Token,
    TokenRefresh,
    UserSettingsResponse,
    UserSettingsUpdate
)
from ..dependencies import get_current_user

router = APIRouter(tags=["Authentication"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user account.

    Args:
        user_data: User registration data (email, password, full_name)
        db: Database session

    Returns:
        AuthResponse: User data with access and refresh tokens

    Raises:
        HTTPException: 400 if email already registered
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        is_active=True,
        is_verified=False,  # Can be used for email verification later
        last_login_at=datetime.utcnow()
    )

    db.add(new_user)
    db.flush()  # Get user.id without committing

    # Create default settings for user
    user_settings = UserSettings(
        user_id=new_user.id,
        dark_mode=False,
        language="en",
        region="US",
        auto_generate_scripts=True,
        notifications_trends=True,
        notifications_competitors=True,
        notifications_new_videos=False,
        notifications_weekly_report=True
    )

    db.add(user_settings)
    db.commit()
    db.refresh(new_user)

    # Generate tokens (sub must be string for JWT standard)
    access_token = create_access_token(data={"sub": str(new_user.id)})
    refresh_token = create_refresh_token(data={"sub": str(new_user.id)})

    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user)
    )


@router.post("/login", response_model=AuthResponse)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticate user and return tokens.

    Args:
        credentials: User login credentials (email, password)
        db: Database session

    Returns:
        AuthResponse: User data with access and refresh tokens

    Raises:
        HTTPException: 401 if credentials are invalid
    """
    # Find user by email
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify password
    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled. Please contact support."
        )

    # Update last login time
    user.last_login_at = datetime.utcnow()
    db.commit()

    # Generate tokens (sub must be string for JWT standard)
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.post("/refresh", response_model=Token)
async def refresh_token(token_data: TokenRefresh, db: Session = Depends(get_db)):
    """
    Refresh access token using refresh token.

    Args:
        token_data: Refresh token
        db: Database session

    Returns:
        Token: New access and refresh tokens

    Raises:
        HTTPException: 401 if refresh token is invalid
    """
    # Decode refresh token
    payload = decode_token(token_data.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get user ID from token
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    # Verify user exists and is active
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    # Generate new tokens (sub must be string for JWT standard)
    new_access_token = create_access_token(data={"sub": str(user.id)})
    new_refresh_token = create_refresh_token(data={"sub": str(user.id)})

    return Token(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer"
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user information.

    Args:
        current_user: Current user from JWT token

    Returns:
        UserResponse: Current user data
    """
    return UserResponse.model_validate(current_user)


@router.get("/me/settings", response_model=UserSettingsResponse)
async def get_user_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's settings.

    Args:
        current_user: Current user from JWT token
        db: Database session

    Returns:
        UserSettingsResponse: User settings data
    """
    settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()

    if not settings:
        # Create default settings if they don't exist
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return UserSettingsResponse.model_validate(settings)


@router.patch("/me/settings", response_model=UserSettingsResponse)
async def update_user_settings(
    settings_update: UserSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user's settings.

    Args:
        settings_update: Settings data to update
        current_user: Current user from JWT token
        db: Database session

    Returns:
        UserSettingsResponse: Updated settings data
    """
    settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()

    if not settings:
        # Create settings if they don't exist
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)

    # Update only provided fields
    update_data = settings_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(settings, field, value)

    settings.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(settings)

    return UserSettingsResponse.model_validate(settings)


# =============================================================================
# OAUTH / SUPABASE SYNC
# =============================================================================

from pydantic import BaseModel
from typing import Optional

class OAuthSyncRequest(BaseModel):
    """Request to sync OAuth user with our database."""
    supabase_id: str
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    provider: str = "google"


@router.post("/oauth/sync", response_model=AuthResponse)
async def sync_oauth_user(data: OAuthSyncRequest, db: Session = Depends(get_db)):
    """
    Sync Supabase OAuth user with our database.

    Called by frontend after successful Supabase OAuth login.
    Creates user if not exists, returns our JWT tokens.

    Args:
        data: OAuth user data from Supabase
        db: Database session

    Returns:
        AuthResponse: Our JWT tokens and user data
    """
    import logging
    logger = logging.getLogger(__name__)

    try:
        # Try to find existing user by email
        user = db.query(User).filter(User.email == data.email).first()

        if user is None:
            # Create new user from OAuth data
            user = User(
                email=data.email,
                full_name=data.full_name or data.email.split("@")[0],
                avatar_url=data.avatar_url,
                hashed_password="",  # No password for OAuth users
                is_active=True,
                is_verified=True,  # OAuth users are verified
                oauth_provider=data.provider,
                oauth_id=data.supabase_id,
                last_login_at=datetime.utcnow()
            )
            db.add(user)
            db.flush()

            # Create default settings
            user_settings = UserSettings(
                user_id=user.id,
                dark_mode=False,
                language="en",
                region="US",
                auto_generate_scripts=True,
                notifications_trends=True,
                notifications_competitors=True,
                notifications_new_videos=False,
                notifications_weekly_report=True
            )
            db.add(user_settings)
            db.commit()
            db.refresh(user)
        else:
            # Update existing user
            user.last_login_at = datetime.utcnow()
            if data.avatar_url and not user.avatar_url:
                user.avatar_url = data.avatar_url
            if data.full_name and user.full_name == user.email.split("@")[0]:
                user.full_name = data.full_name
            db.commit()
            db.refresh(user)

        # Generate our JWT tokens
        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})

        return AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=UserResponse.model_validate(user)
        )

    except Exception as e:
        logger.error(f"OAuth sync error: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OAuth sync failed: {str(e)}"
        )


# =============================================================================
# DEV MODE - SUBSCRIPTION UPGRADE (NO STRIPE)
# =============================================================================

class DevUpgradeRequest(BaseModel):
    """Request for dev mode subscription upgrade."""
    plan: str  # 'free', 'creator', 'pro', 'agency'
    dev_code: str  # Secret dev code

# Dev code for subscription changes - MUST be set in environment!
# Never hardcode the actual code in source control
DEV_UPGRADE_CODE = os.getenv("DEV_UPGRADE_CODE", "")


@router.post("/dev/upgrade")
async def dev_upgrade_subscription(
    data: DevUpgradeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    [DEV MODE] Upgrade user subscription without Stripe.

    This endpoint is for development/testing purposes only.
    Requires a secret dev code to prevent unauthorized access.

    Args:
        data: Plan and dev code
        current_user: Current authenticated user
        db: Database session

    Returns:
        Updated user data
    """
    from ...db.models import SubscriptionTier

    # Verify dev code
    if data.dev_code != DEV_UPGRADE_CODE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid dev code"
        )

    # Validate plan
    valid_plans = ['free', 'creator', 'pro', 'agency']
    if data.plan.lower() not in valid_plans:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan. Must be one of: {', '.join(valid_plans)}"
        )

    # Map plan to tier enum
    tier_map = {
        'free': SubscriptionTier.FREE,
        'creator': SubscriptionTier.CREATOR,
        'pro': SubscriptionTier.PRO,
        'agency': SubscriptionTier.AGENCY,
    }

    # Update user subscription
    current_user.subscription_tier = tier_map[data.plan.lower()]
    db.commit()
    db.refresh(current_user)

    return {
        "status": "success",
        "message": f"Subscription updated to {data.plan.upper()}",
        "user": UserResponse.model_validate(current_user)
    }
