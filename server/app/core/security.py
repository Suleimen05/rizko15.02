"""
Security utilities for password hashing and JWT token management.
Production-ready implementation with industry best practices.

Features:
- JWT tokens with jti (unique ID) for server-side revocation
- Token blacklist for secure logout
- bcrypt password hashing
"""
import logging
import time
import uuid
from collections import OrderedDict
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from ..core.config import settings

# Logger for security and token operations
logger = logging.getLogger(__name__)

# Password hashing context using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Configuration
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password.

    Args:
        plain_password: The plain text password to verify
        hashed_password: The hashed password to compare against

    Returns:
        True if passwords match, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Hash a password for storage.

    Args:
        password: Plain text password

    Returns:
        Hashed password string
    """
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token with unique ID (jti) for revocation support.

    Args:
        data: Dictionary containing claims to encode in the token
        expires_delta: Optional custom expiration time

    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()

    now = datetime.utcnow()
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({
        "exp": expire,
        "iat": int(now.timestamp()),
        "jti": uuid.uuid4().hex,
        "type": "access",
    })
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """
    Create a JWT refresh token with longer expiration and unique ID.

    Args:
        data: Dictionary containing claims to encode in the token

    Returns:
        Encoded JWT refresh token string
    """
    to_encode = data.copy()
    now = datetime.utcnow()
    expire = now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({
        "exp": expire,
        "iat": int(now.timestamp()),
        "jti": uuid.uuid4().hex,
        "type": "refresh",
    })
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[dict]:
    """
    Decode and validate a JWT token.
    Checks token blacklist if jti claim is present (backward-compatible).

    Args:
        token: JWT token string to decode

    Returns:
        Decoded token payload if valid, None otherwise
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])

        # Check blacklist (backward-compatible: tokens without jti are allowed)
        jti = payload.get("jti")
        if jti and token_blacklist.is_blacklisted(jti):
            logger.warning(f"Rejected blacklisted token jti={jti[:8]}...")
            return None

        logger.debug(f"Token decoded successfully - sub: {payload.get('sub')}")
        return payload

    except JWTError as jwt_err:
        # Security: Log JWT errors for monitoring potential attacks
        logger.warning(f"JWT decode failed: {type(jwt_err).__name__}")
        return None
    except Exception as exc:
        # Critical: unexpected errors in token decoding
        logger.error(f"Token decode error: {type(exc).__name__}", exc_info=True)
        return None


# =============================================================================
# TOKEN BLACKLIST (server-side token revocation)
# =============================================================================

class TokenBlacklist:
    """
    In-memory token blacklist for server-side JWT revocation.
    Tokens are identified by their unique jti claim.

    For production at scale, consider Redis-based implementation.
    """

    MAX_SIZE = 10000
    EVICT_BATCH = 1000

    def __init__(self):
        self._blacklist: OrderedDict = OrderedDict()

    def blacklist(self, jti: str) -> None:
        """Add a token's jti to the blacklist."""
        self._blacklist[jti] = time.time()
        if len(self._blacklist) > self.MAX_SIZE:
            # Evict oldest entries
            for _ in range(self.EVICT_BATCH):
                if self._blacklist:
                    self._blacklist.popitem(last=False)

    def is_blacklisted(self, jti: str) -> bool:
        """Check if a token's jti has been blacklisted."""
        return jti in self._blacklist

    def cleanup(self) -> int:
        """Remove entries older than REFRESH_TOKEN_EXPIRE_DAYS + 1 day."""
        cutoff = time.time() - ((REFRESH_TOKEN_EXPIRE_DAYS + 1) * 86400)
        removed = 0
        keys_to_remove = [
            k for k, v in self._blacklist.items() if v < cutoff
        ]
        for k in keys_to_remove:
            del self._blacklist[k]
            removed += 1
        return removed


# Global singleton
token_blacklist = TokenBlacklist()
