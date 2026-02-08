"""
Token encryption utilities using Fernet symmetric encryption.
Used for encrypting OAuth tokens stored in the database.

Generate ENCRYPTION_KEY with:
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""
import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

_ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "")
_fernet = None


def _get_fernet():
    """Lazy-initialize Fernet instance. Returns None if key not configured."""
    global _fernet
    if _fernet is not None:
        return _fernet
    if not _ENCRYPTION_KEY:
        logger.warning("ENCRYPTION_KEY not set — OAuth tokens will be stored in plaintext")
        return None
    try:
        from cryptography.fernet import Fernet
        _fernet = Fernet(_ENCRYPTION_KEY.encode())
        return _fernet
    except Exception as e:
        logger.error(f"Invalid ENCRYPTION_KEY: {e}")
        return None


def encrypt_token(plaintext: Optional[str]) -> Optional[str]:
    """Encrypt a token string. Returns plaintext if encryption not configured."""
    if plaintext is None:
        return None
    f = _get_fernet()
    if f is None:
        return plaintext
    return f.encrypt(plaintext.encode()).decode()


def decrypt_token(ciphertext: Optional[str]) -> Optional[str]:
    """Decrypt a token string. Handles both encrypted and legacy plaintext values."""
    if ciphertext is None:
        return None
    f = _get_fernet()
    if f is None:
        return ciphertext
    try:
        return f.decrypt(ciphertext.encode()).decode()
    except Exception:
        # Legacy plaintext token — return as-is for backward compatibility
        logger.warning("Failed to decrypt token — returning as plaintext (legacy data)")
        return ciphertext
