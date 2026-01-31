"""
FastAPI Dependencies for Authentication, Authorization & Rate Limiting.

Enterprise-grade dependency injection with:
- JWT token validation
- Role-based access control (RBAC)
- Subscription tier enforcement
- Rate limiting per user/tier
- Request context management

Security Standards:
- OWASP compliant token validation
- Timing-safe comparisons
- Proper error masking (no information leakage)
"""
import time
import hashlib
from datetime import datetime
from typing import Optional, Dict, Any
from collections import defaultdict

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.security import decode_token
from ..db.models import User, UserSettings, SubscriptionTier


# =============================================================================
# SECURITY SCHEME
# =============================================================================

security = HTTPBearer(auto_error=False)  # auto_error=False for optional auth


# =============================================================================
# RATE LIMITING
# =============================================================================

class RateLimiter:
    """
    In-memory rate limiter with sliding window algorithm.

    For production at scale, consider Redis-based implementation.

    Limits per tier (requests per minute):
    - FREE: 10 req/min
    - CREATOR: 30 req/min
    - PRO: 100 req/min
    - AGENCY: 500 req/min
    """

    TIER_LIMITS: Dict[SubscriptionTier, int] = {
        SubscriptionTier.FREE: 10,
        SubscriptionTier.CREATOR: 30,
        SubscriptionTier.PRO: 100,
        SubscriptionTier.AGENCY: 500,
    }

    # Deep analyze limits per day
    DEEP_ANALYZE_LIMITS: Dict[SubscriptionTier, int] = {
        SubscriptionTier.FREE: 0,      # No access
        SubscriptionTier.CREATOR: 0,   # No access
        SubscriptionTier.PRO: 20,
        SubscriptionTier.AGENCY: 100,
    }

    def __init__(self):
        # {user_id: [(timestamp, count), ...]}
        self._requests: Dict[int, list] = defaultdict(list)
        self._deep_analyze_daily: Dict[str, int] = defaultdict(int)  # "user_id:date" -> count
        self._window_seconds = 60  # 1 minute window

    def _clean_old_requests(self, user_id: int) -> None:
        """Remove requests older than the window."""
        cutoff = time.time() - self._window_seconds
        self._requests[user_id] = [
            (ts, count) for ts, count in self._requests[user_id]
            if ts > cutoff
        ]

    def _get_request_count(self, user_id: int) -> int:
        """Get total requests in current window."""
        self._clean_old_requests(user_id)
        return sum(count for _, count in self._requests[user_id])

    def check_rate_limit(self, user_id: int, tier: SubscriptionTier) -> None:
        """
        Check if user is within rate limits.

        Raises:
            HTTPException: 429 if rate limit exceeded
        """
        limit = self.TIER_LIMITS.get(tier, 10)
        current = self._get_request_count(user_id)

        if current >= limit:
            retry_after = self._window_seconds
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": "Rate limit exceeded",
                    "limit": limit,
                    "window_seconds": self._window_seconds,
                    "tier": tier.value,
                    "retry_after": retry_after,
                    "upgrade_url": "/pricing"
                },
                headers={"Retry-After": str(retry_after)}
            )

        # Record this request
        self._requests[user_id].append((time.time(), 1))

    def check_deep_analyze_limit(self, user_id: int, tier: SubscriptionTier) -> None:
        """
        Check daily deep analyze limit.

        Raises:
            HTTPException: 403 if deep analyze not available for tier
            HTTPException: 429 if daily limit exceeded
        """
        daily_limit = self.DEEP_ANALYZE_LIMITS.get(tier, 0)

        if daily_limit == 0:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "Deep Analyze requires Pro plan",
                    "upgrade_url": "/pricing",
                    "current_tier": tier.value,
                    "required_tier": "pro",
                    "features": [
                        "6-Layer UTS Score breakdown",
                        "Visual clustering (AI)",
                        "Growth velocity prediction",
                        "Saturation indicator",
                        "Sound cascade analysis",
                        "Auto-rescan (24h tracking)"
                    ]
                }
            )

        today = datetime.utcnow().strftime("%Y-%m-%d")
        key = f"{user_id}:{today}"

        if self._deep_analyze_daily[key] >= daily_limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": "Daily Deep Analyze limit reached",
                    "limit": daily_limit,
                    "current": self._deep_analyze_daily[key],
                    "resets_at": f"{today}T00:00:00Z (next day)",
                    "upgrade_url": "/pricing"
                }
            )

        # Increment counter
        self._deep_analyze_daily[key] += 1

    def get_remaining_limits(self, user_id: int, tier: SubscriptionTier) -> Dict[str, Any]:
        """Get remaining limits for user."""
        limit = self.TIER_LIMITS.get(tier, 10)
        current = self._get_request_count(user_id)

        today = datetime.utcnow().strftime("%Y-%m-%d")
        deep_key = f"{user_id}:{today}"
        deep_limit = self.DEEP_ANALYZE_LIMITS.get(tier, 0)
        deep_current = self._deep_analyze_daily.get(deep_key, 0)

        return {
            "rate_limit": {
                "limit": limit,
                "remaining": max(0, limit - current),
                "window_seconds": self._window_seconds
            },
            "deep_analyze": {
                "limit": deep_limit,
                "remaining": max(0, deep_limit - deep_current),
                "resets_at": f"{today}T00:00:00Z"
            }
        }


# Global rate limiter instance
rate_limiter = RateLimiter()


# =============================================================================
# AUTHENTICATION DEPENDENCIES
# =============================================================================

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to get the current authenticated user from JWT token.

    Security:
    - Validates JWT signature and expiration
    - Checks user exists and is active
    - No sensitive data in error messages

    Supports tokens from:
    - Authorization header (Bearer token)
    - Query parameter (?token=...) for OAuth redirects

    Args:
        request: FastAPI Request object
        credentials: HTTP Bearer token from Authorization header
        db: Database session

    Returns:
        User: The authenticated user object

    Raises:
        HTTPException: 401 if token is invalid or user not found
        HTTPException: 403 if user account is disabled
    """
    token = None

    # First try Authorization header
    if credentials is not None:
        token = credentials.credentials
    # Then try query parameter (for OAuth redirects)
    elif "token" in request.query_params:
        token = request.query_params.get("token")

    # Check if token provided
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extract user ID from token
    user_id: Optional[int] = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Ensure user_id is integer
    try:
        user_id = int(user_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled. Contact support.",
        )

    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Optional authentication - returns None if no valid token.
    Useful for endpoints that work differently for authenticated users.
    """
    if credentials is None:
        return None

    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency to get current active user with additional checks.
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )
    return current_user


async def get_current_verified_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency requiring verified email.
    """
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification required",
            headers={"X-Verification-Required": "true"}
        )
    return current_user


async def get_current_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency to verify current user has admin privileges.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


# =============================================================================
# SUBSCRIPTION TIER DEPENDENCIES
# =============================================================================

class RequireSubscription:
    """
    Dependency class for subscription tier requirements.

    Usage:
        @router.get("/pro-feature")
        async def pro_feature(
            user: User = Depends(RequireSubscription(SubscriptionTier.PRO))
        ):
            ...
    """

    def __init__(self, minimum_tier: SubscriptionTier):
        self.minimum_tier = minimum_tier
        self._tier_order = {
            SubscriptionTier.FREE: 0,
            SubscriptionTier.CREATOR: 1,
            SubscriptionTier.PRO: 2,
            SubscriptionTier.AGENCY: 3,
        }

    async def __call__(
        self,
        current_user: User = Depends(get_current_user)
    ) -> User:
        user_tier_level = self._tier_order.get(current_user.subscription_tier, 0)
        required_level = self._tier_order.get(self.minimum_tier, 0)

        if user_tier_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": f"This feature requires {self.minimum_tier.value} plan",
                    "current_tier": current_user.subscription_tier.value,
                    "required_tier": self.minimum_tier.value,
                    "upgrade_url": "/pricing"
                }
            )

        return current_user


# Convenience dependencies for common tier checks
require_creator = RequireSubscription(SubscriptionTier.CREATOR)
require_pro = RequireSubscription(SubscriptionTier.PRO)
require_agency = RequireSubscription(SubscriptionTier.AGENCY)


# =============================================================================
# RATE LIMITING DEPENDENCIES
# =============================================================================

async def check_rate_limit(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Check and enforce rate limits based on user's subscription tier.
    """
    rate_limiter.check_rate_limit(current_user.id, current_user.subscription_tier)
    return current_user


async def check_deep_analyze_limit(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Check and enforce deep analyze limits.
    """
    rate_limiter.check_deep_analyze_limit(current_user.id, current_user.subscription_tier)
    return current_user


async def get_user_limits(
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get user's current rate limit status.
    """
    return rate_limiter.get_remaining_limits(
        current_user.id,
        current_user.subscription_tier
    )


# =============================================================================
# REQUEST CONTEXT
# =============================================================================

class RequestContext:
    """
    Request context with user info and metadata.
    Useful for logging and auditing.
    """

    def __init__(
        self,
        user: User,
        request: Request,
        db: Session
    ):
        self.user = user
        self.user_id = user.id
        self.request = request
        self.db = db
        self.request_id = self._generate_request_id(request)
        self.timestamp = datetime.utcnow()

    def _generate_request_id(self, request: Request) -> str:
        """Generate unique request ID for tracing."""
        raw = f"{time.time()}-{request.client.host if request.client else 'unknown'}"
        return hashlib.md5(raw.encode()).hexdigest()[:16]


async def get_request_context(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> RequestContext:
    """
    Dependency providing full request context.
    """
    return RequestContext(current_user, request, db)


# =============================================================================
# USER SETTINGS HELPER
# =============================================================================

async def get_user_with_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> tuple[User, UserSettings]:
    """
    Get user with their settings, creating default settings if needed.
    """
    settings = db.query(UserSettings).filter(
        UserSettings.user_id == current_user.id
    ).first()

    if settings is None:
        # Create default settings
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return current_user, settings


# =============================================================================
# CREDITS MANAGEMENT
# =============================================================================

class CreditManager:
    """
    Manages user credits for premium operations.
    """

    OPERATION_COSTS = {
        "deep_analyze": 5,
        "ai_script": 2,
        "competitor_add": 1,
        "export_report": 3,
    }

    @classmethod
    async def check_and_deduct(
        cls,
        operation: str,
        user: User,
        db: Session
    ) -> None:
        """
        Check if user has enough credits and deduct.

        Raises:
            HTTPException: 402 if insufficient credits
        """
        cost = cls.OPERATION_COSTS.get(operation, 1)

        if user.credits < cost:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail={
                    "error": "Insufficient credits",
                    "required": cost,
                    "available": user.credits,
                    "operation": operation,
                    "purchase_url": "/pricing"
                }
            )

        user.credits -= cost
        db.commit()

    @classmethod
    def get_operation_cost(cls, operation: str) -> int:
        """Get cost for an operation."""
        return cls.OPERATION_COSTS.get(operation, 1)


async def require_credits(
    operation: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency factory for credit-requiring operations.

    Usage:
        @router.post("/expensive-operation")
        async def expensive(
            user: User = Depends(lambda u=Depends(get_current_user),
                                  db=Depends(get_db):
                                  require_credits("deep_analyze", u, db))
        ):
            ...
    """
    await CreditManager.check_and_deduct(operation, current_user, db)
    return current_user
