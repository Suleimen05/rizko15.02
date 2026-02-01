"""
OAuth routes for connecting social media accounts.
Supports TikTok, Instagram (Meta), and YouTube (Google).

TikTok OAuth 2.0 with PKCE (required since 2023):
- code_verifier: Random string 43-128 chars
- code_challenge: SHA256 hash of verifier, base64url encoded
- code_challenge_method: Always "S256"
"""
import os
import secrets
import hashlib
import base64
import httpx
from datetime import datetime, timedelta
from typing import Optional
from urllib.parse import urlencode
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from ...core.database import get_db
from ...db.models import User, UserAccount, SocialPlatform
from ..dependencies import get_current_user

router = APIRouter(tags=["OAuth"])

# =============================================================================
# CONFIGURATION
# =============================================================================

# Base URLs - use environment variables in production
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

# TikTok OAuth
TIKTOK_CLIENT_KEY = os.getenv("TIKTOK_CLIENT_KEY", "")
TIKTOK_CLIENT_SECRET = os.getenv("TIKTOK_CLIENT_SECRET", "")
TIKTOK_REDIRECT_URI = f"{BACKEND_URL}/api/oauth/tiktok/callback"

# Instagram/Meta OAuth
INSTAGRAM_APP_ID = os.getenv("INSTAGRAM_APP_ID", "")
INSTAGRAM_APP_SECRET = os.getenv("INSTAGRAM_APP_SECRET", "")
INSTAGRAM_REDIRECT_URI = f"{BACKEND_URL}/api/oauth/instagram/callback"

# YouTube/Google OAuth
YOUTUBE_CLIENT_ID = os.getenv("YOUTUBE_CLIENT_ID", "")
YOUTUBE_CLIENT_SECRET = os.getenv("YOUTUBE_CLIENT_SECRET", "")
YOUTUBE_REDIRECT_URI = f"{BACKEND_URL}/api/oauth/youtube/callback"

# Twitter/X OAuth 2.0
TWITTER_CLIENT_ID = os.getenv("TWITTER_CLIENT_ID", "")
TWITTER_CLIENT_SECRET = os.getenv("TWITTER_CLIENT_SECRET", "")
TWITTER_REDIRECT_URI = f"{BACKEND_URL}/api/oauth/twitter/callback"

# State storage (use Redis in production)
oauth_states: dict = {}


# =============================================================================
# PKCE HELPERS (Required for TikTok OAuth)
# =============================================================================

def generate_code_verifier() -> str:
    """Generate a random code verifier for PKCE (43-128 characters)."""
    # Generate 64 random bytes and encode to base64url (gives ~86 chars)
    return secrets.token_urlsafe(64)


def generate_code_challenge(code_verifier: str) -> str:
    """Generate code challenge from verifier using SHA256."""
    # SHA256 hash of the verifier
    digest = hashlib.sha256(code_verifier.encode('utf-8')).digest()
    # Base64url encode (no padding)
    return base64.urlsafe_b64encode(digest).rstrip(b'=').decode('utf-8')


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def generate_state(user_id: int, platform: str, code_verifier: str = None) -> str:
    """Generate secure state parameter for OAuth."""
    state = secrets.token_urlsafe(32)
    oauth_states[state] = {
        "user_id": user_id,
        "platform": platform,
        "created_at": datetime.utcnow(),
        "code_verifier": code_verifier  # Store for PKCE verification
    }
    return state


def verify_state(state: str) -> Optional[dict]:
    """Verify and consume state parameter."""
    if state not in oauth_states:
        return None
    data = oauth_states.pop(state)
    # Check if state is not expired (15 min)
    if datetime.utcnow() - data["created_at"] > timedelta(minutes=15):
        return None
    return data


# =============================================================================
# TIKTOK OAUTH (with PKCE - required since 2023)
# =============================================================================

@router.get("/tiktok")
async def tiktok_auth(
    current_user: User = Depends(get_current_user)
):
    """
    Initiate TikTok OAuth flow with PKCE.
    Redirects user to TikTok login page.

    PKCE Flow:
    1. Generate code_verifier (random string)
    2. Create code_challenge = SHA256(code_verifier) base64url encoded
    3. Send code_challenge to TikTok
    4. On callback, send code_verifier to exchange for token
    """
    if not TIKTOK_CLIENT_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="TikTok OAuth not configured"
        )

    # Generate PKCE code verifier and challenge
    code_verifier = generate_code_verifier()
    code_challenge = generate_code_challenge(code_verifier)

    # Store code_verifier with state for later use in callback
    state = generate_state(current_user.id, "tiktok", code_verifier)

    # TikTok OAuth URL with PKCE
    params = {
        "client_key": TIKTOK_CLIENT_KEY,
        "scope": "user.info.basic,video.list",
        "response_type": "code",
        "redirect_uri": TIKTOK_REDIRECT_URI,
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256"
    }
    auth_url = f"https://www.tiktok.com/v2/auth/authorize/?{urlencode(params)}"

    return RedirectResponse(url=auth_url)


@router.get("/tiktok/callback")
async def tiktok_callback(
    code: str = Query(None),
    state: str = Query(None),
    error: str = Query(None),
    error_description: str = Query(None),
    db: Session = Depends(get_db)
):
    """Handle TikTok OAuth callback with PKCE verification."""
    if error:
        error_msg = error_description or error
        return RedirectResponse(
            url=f"{FRONTEND_URL}/dashboard/connect-accounts?error={error_msg}"
        )

    state_data = verify_state(state)
    if not state_data:
        return RedirectResponse(
            url=f"{FRONTEND_URL}/dashboard/connect-accounts?error=invalid_state"
        )

    user_id = state_data["user_id"]
    code_verifier = state_data.get("code_verifier")  # Get stored code_verifier for PKCE

    # Exchange code for access token (with PKCE code_verifier)
    async with httpx.AsyncClient() as client:
        token_data = {
            "client_key": TIKTOK_CLIENT_KEY,
            "client_secret": TIKTOK_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": TIKTOK_REDIRECT_URI
        }
        # Add code_verifier for PKCE (required!)
        if code_verifier:
            token_data["code_verifier"] = code_verifier

        token_response = await client.post(
            "https://open.tiktokapis.com/v2/oauth/token/",
            data=token_data
        )

    if token_response.status_code != 200:
        return RedirectResponse(
            url=f"{FRONTEND_URL}/dashboard/connect-accounts?error=token_exchange_failed"
        )

    token_data = token_response.json()
    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")
    expires_in = token_data.get("expires_in", 86400)
    open_id = token_data.get("open_id")

    # Get user info from TikTok
    async with httpx.AsyncClient() as client:
        user_response = await client.get(
            "https://open.tiktokapis.com/v2/user/info/",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"fields": "open_id,union_id,avatar_url,display_name"}
        )

    if user_response.status_code == 200:
        user_data = user_response.json().get("data", {}).get("user", {})
        display_name = user_data.get("display_name", "")
        avatar_url = user_data.get("avatar_url", "")
        username = user_data.get("display_name", open_id)
    else:
        display_name = ""
        avatar_url = ""
        username = open_id

    # Save or update account
    existing = db.query(UserAccount).filter(
        UserAccount.user_id == user_id,
        UserAccount.platform == SocialPlatform.TIKTOK,
        UserAccount.platform_user_id == open_id
    ).first()

    if existing:
        existing.oauth_access_token = access_token
        existing.oauth_refresh_token = refresh_token
        existing.oauth_token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
        existing.oauth_connected_at = datetime.utcnow()
        existing.is_verified = True
        existing.display_name = display_name
        existing.avatar_url = avatar_url
    else:
        new_account = UserAccount(
            user_id=user_id,
            platform=SocialPlatform.TIKTOK,
            username=username,
            display_name=display_name,
            avatar_url=avatar_url,
            platform_user_id=open_id,
            oauth_access_token=access_token,
            oauth_refresh_token=refresh_token,
            oauth_token_expires_at=datetime.utcnow() + timedelta(seconds=expires_in),
            oauth_scope="user.info.basic,video.list",
            oauth_connected_at=datetime.utcnow(),
            is_verified=True,
            is_active=True
        )
        db.add(new_account)

    db.commit()

    return RedirectResponse(
        url=f"{FRONTEND_URL}/dashboard/connect-accounts?success=tiktok"
    )


# =============================================================================
# INSTAGRAM OAUTH
# =============================================================================

@router.get("/instagram")
async def instagram_auth(
    current_user: User = Depends(get_current_user)
):
    """Initiate Instagram OAuth flow."""
    if not INSTAGRAM_APP_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Instagram OAuth not configured"
        )

    state = generate_state(current_user.id, "instagram")

    params = {
        "client_id": INSTAGRAM_APP_ID,
        "redirect_uri": INSTAGRAM_REDIRECT_URI,
        "scope": "user_profile,user_media",
        "response_type": "code",
        "state": state
    }
    auth_url = f"https://api.instagram.com/oauth/authorize?{urlencode(params)}"

    return RedirectResponse(url=auth_url)


@router.get("/instagram/callback")
async def instagram_callback(
    code: str = Query(None),
    state: str = Query(None),
    error: str = Query(None),
    db: Session = Depends(get_db)
):
    """Handle Instagram OAuth callback."""
    if error:
        return RedirectResponse(
            url=f"{FRONTEND_URL}/dashboard/connect-accounts?error={error}"
        )

    state_data = verify_state(state)
    if not state_data:
        return RedirectResponse(
            url=f"{FRONTEND_URL}/dashboard/connect-accounts?error=invalid_state"
        )

    user_id = state_data["user_id"]

    # Exchange code for access token
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://api.instagram.com/oauth/access_token",
            data={
                "client_id": INSTAGRAM_APP_ID,
                "client_secret": INSTAGRAM_APP_SECRET,
                "grant_type": "authorization_code",
                "redirect_uri": INSTAGRAM_REDIRECT_URI,
                "code": code
            }
        )

    if token_response.status_code != 200:
        return RedirectResponse(
            url=f"{FRONTEND_URL}/dashboard/connect-accounts?error=token_exchange_failed"
        )

    token_data = token_response.json()
    short_token = token_data.get("access_token")
    ig_user_id = str(token_data.get("user_id"))

    # Exchange for long-lived token
    async with httpx.AsyncClient() as client:
        long_token_response = await client.get(
            "https://graph.instagram.com/access_token",
            params={
                "grant_type": "ig_exchange_token",
                "client_secret": INSTAGRAM_APP_SECRET,
                "access_token": short_token
            }
        )

    if long_token_response.status_code == 200:
        long_token_data = long_token_response.json()
        access_token = long_token_data.get("access_token")
        expires_in = long_token_data.get("expires_in", 5184000)  # 60 days
    else:
        access_token = short_token
        expires_in = 3600

    # Get user profile
    async with httpx.AsyncClient() as client:
        profile_response = await client.get(
            f"https://graph.instagram.com/me",
            params={
                "fields": "id,username,account_type,media_count",
                "access_token": access_token
            }
        )

    if profile_response.status_code == 200:
        profile_data = profile_response.json()
        username = profile_data.get("username", "")
    else:
        username = ig_user_id

    # Save or update account
    existing = db.query(UserAccount).filter(
        UserAccount.user_id == user_id,
        UserAccount.platform == SocialPlatform.INSTAGRAM,
        UserAccount.platform_user_id == ig_user_id
    ).first()

    if existing:
        existing.oauth_access_token = access_token
        existing.oauth_token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
        existing.oauth_connected_at = datetime.utcnow()
        existing.is_verified = True
        existing.username = username
    else:
        new_account = UserAccount(
            user_id=user_id,
            platform=SocialPlatform.INSTAGRAM,
            username=username,
            platform_user_id=ig_user_id,
            oauth_access_token=access_token,
            oauth_token_expires_at=datetime.utcnow() + timedelta(seconds=expires_in),
            oauth_scope="user_profile,user_media",
            oauth_connected_at=datetime.utcnow(),
            is_verified=True,
            is_active=True
        )
        db.add(new_account)

    db.commit()

    return RedirectResponse(
        url=f"{FRONTEND_URL}/dashboard/connect-accounts?success=instagram"
    )


# =============================================================================
# YOUTUBE OAUTH
# =============================================================================

@router.get("/youtube")
async def youtube_auth(
    current_user: User = Depends(get_current_user)
):
    """Initiate YouTube OAuth flow."""
    if not YOUTUBE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="YouTube OAuth not configured"
        )

    state = generate_state(current_user.id, "youtube")

    params = {
        "client_id": YOUTUBE_CLIENT_ID,
        "redirect_uri": YOUTUBE_REDIRECT_URI,
        "response_type": "code",
        "scope": "https://www.googleapis.com/auth/youtube.readonly",
        "access_type": "offline",
        "prompt": "consent",
        "state": state
    }
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"

    return RedirectResponse(url=auth_url)


@router.get("/youtube/callback")
async def youtube_callback(
    code: str = Query(None),
    state: str = Query(None),
    error: str = Query(None),
    db: Session = Depends(get_db)
):
    """Handle YouTube OAuth callback."""
    if error:
        return RedirectResponse(
            url=f"{FRONTEND_URL}/dashboard/connect-accounts?error={error}"
        )

    state_data = verify_state(state)
    if not state_data:
        return RedirectResponse(
            url=f"{FRONTEND_URL}/dashboard/connect-accounts?error=invalid_state"
        )

    user_id = state_data["user_id"]

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": YOUTUBE_CLIENT_ID,
                "client_secret": YOUTUBE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": YOUTUBE_REDIRECT_URI
            }
        )

    if token_response.status_code != 200:
        return RedirectResponse(
            url=f"{FRONTEND_URL}/dashboard/connect-accounts?error=token_exchange_failed"
        )

    token_data = token_response.json()
    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")
    expires_in = token_data.get("expires_in", 3600)

    # Get channel info
    async with httpx.AsyncClient() as client:
        channel_response = await client.get(
            "https://www.googleapis.com/youtube/v3/channels",
            params={
                "part": "snippet,statistics",
                "mine": "true"
            },
            headers={"Authorization": f"Bearer {access_token}"}
        )

    if channel_response.status_code == 200:
        channels = channel_response.json().get("items", [])
        if channels:
            channel = channels[0]
            channel_id = channel["id"]
            snippet = channel.get("snippet", {})
            username = snippet.get("title", "")
            avatar_url = snippet.get("thumbnails", {}).get("default", {}).get("url", "")
        else:
            channel_id = ""
            username = "Unknown"
            avatar_url = ""
    else:
        channel_id = ""
        username = "Unknown"
        avatar_url = ""

    # Save or update account
    existing = db.query(UserAccount).filter(
        UserAccount.user_id == user_id,
        UserAccount.platform == SocialPlatform.YOUTUBE,
        UserAccount.platform_user_id == channel_id
    ).first()

    if existing:
        existing.oauth_access_token = access_token
        existing.oauth_refresh_token = refresh_token
        existing.oauth_token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
        existing.oauth_connected_at = datetime.utcnow()
        existing.is_verified = True
        existing.username = username
        existing.avatar_url = avatar_url
    else:
        new_account = UserAccount(
            user_id=user_id,
            platform=SocialPlatform.YOUTUBE,
            username=username,
            display_name=username,
            avatar_url=avatar_url,
            platform_user_id=channel_id,
            oauth_access_token=access_token,
            oauth_refresh_token=refresh_token,
            oauth_token_expires_at=datetime.utcnow() + timedelta(seconds=expires_in),
            oauth_scope="youtube.readonly",
            oauth_connected_at=datetime.utcnow(),
            is_verified=True,
            is_active=True
        )
        db.add(new_account)

    db.commit()

    return RedirectResponse(
        url=f"{FRONTEND_URL}/dashboard/connect-accounts?success=youtube"
    )


# =============================================================================
# TWITTER/X OAUTH 2.0
# =============================================================================

@router.get("/twitter")
async def twitter_auth(
    current_user: User = Depends(get_current_user)
):
    """
    Initiate Twitter/X OAuth 2.0 flow with PKCE.
    Twitter requires PKCE for public clients.
    """
    if not TWITTER_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Twitter OAuth not configured"
        )

    # Generate PKCE code verifier and challenge
    code_verifier = generate_code_verifier()
    code_challenge = generate_code_challenge(code_verifier)

    # Store code_verifier with state for later use in callback
    state = generate_state(current_user.id, "twitter", code_verifier)

    # Twitter OAuth 2.0 URL with PKCE
    params = {
        "response_type": "code",
        "client_id": TWITTER_CLIENT_ID,
        "redirect_uri": TWITTER_REDIRECT_URI,
        "scope": "tweet.read users.read offline.access",
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256"
    }
    auth_url = f"https://twitter.com/i/oauth2/authorize?{urlencode(params)}"

    return RedirectResponse(url=auth_url)


@router.get("/twitter/callback")
async def twitter_callback(
    code: str = Query(None),
    state: str = Query(None),
    error: str = Query(None),
    error_description: str = Query(None),
    db: Session = Depends(get_db)
):
    """Handle Twitter/X OAuth 2.0 callback with PKCE verification."""
    if error:
        error_msg = error_description or error
        return RedirectResponse(
            url=f"{FRONTEND_URL}/dashboard/connect-accounts?error={error_msg}"
        )

    state_data = verify_state(state)
    if not state_data:
        return RedirectResponse(
            url=f"{FRONTEND_URL}/dashboard/connect-accounts?error=invalid_state"
        )

    user_id = state_data["user_id"]
    code_verifier = state_data.get("code_verifier")

    # Exchange code for access token (with PKCE code_verifier)
    async with httpx.AsyncClient() as client:
        # Twitter requires Basic Auth with client credentials
        auth_header = base64.b64encode(
            f"{TWITTER_CLIENT_ID}:{TWITTER_CLIENT_SECRET}".encode()
        ).decode()

        token_response = await client.post(
            "https://api.twitter.com/2/oauth2/token",
            headers={
                "Authorization": f"Basic {auth_header}",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            data={
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": TWITTER_REDIRECT_URI,
                "code_verifier": code_verifier
            }
        )

    if token_response.status_code != 200:
        return RedirectResponse(
            url=f"{FRONTEND_URL}/dashboard/connect-accounts?error=token_exchange_failed"
        )

    token_data = token_response.json()
    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")
    expires_in = token_data.get("expires_in", 7200)  # 2 hours default

    # Get user info from Twitter
    async with httpx.AsyncClient() as client:
        user_response = await client.get(
            "https://api.twitter.com/2/users/me",
            headers={"Authorization": f"Bearer {access_token}"},
            params={"user.fields": "id,name,username,profile_image_url"}
        )

    if user_response.status_code == 200:
        user_data = user_response.json().get("data", {})
        twitter_user_id = user_data.get("id", "")
        username = user_data.get("username", "")
        display_name = user_data.get("name", "")
        avatar_url = user_data.get("profile_image_url", "")
    else:
        twitter_user_id = ""
        username = "Unknown"
        display_name = ""
        avatar_url = ""

    # Save or update account
    existing = db.query(UserAccount).filter(
        UserAccount.user_id == user_id,
        UserAccount.platform == SocialPlatform.TWITTER,
        UserAccount.platform_user_id == twitter_user_id
    ).first()

    if existing:
        existing.oauth_access_token = access_token
        existing.oauth_refresh_token = refresh_token
        existing.oauth_token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
        existing.oauth_connected_at = datetime.utcnow()
        existing.is_verified = True
        existing.username = username
        existing.display_name = display_name
        existing.avatar_url = avatar_url
    else:
        new_account = UserAccount(
            user_id=user_id,
            platform=SocialPlatform.TWITTER,
            username=username,
            display_name=display_name,
            avatar_url=avatar_url,
            platform_user_id=twitter_user_id,
            oauth_access_token=access_token,
            oauth_refresh_token=refresh_token,
            oauth_token_expires_at=datetime.utcnow() + timedelta(seconds=expires_in),
            oauth_scope="tweet.read,users.read,offline.access",
            oauth_connected_at=datetime.utcnow(),
            is_verified=True,
            is_active=True
        )
        db.add(new_account)

    db.commit()

    return RedirectResponse(
        url=f"{FRONTEND_URL}/dashboard/connect-accounts?success=twitter"
    )


# =============================================================================
# META DATA DELETION CALLBACK
# =============================================================================

@router.post("/meta/data-deletion")
async def meta_data_deletion(request: Request, db: Session = Depends(get_db)):
    """
    Handle Meta data deletion callback.
    Required by Meta Platform Terms for Instagram integration.
    """
    try:
        body = await request.json()
        signed_request = body.get("signed_request")

        # In production: verify signed_request with app secret
        # For now, just acknowledge the request

        # Generate confirmation code
        confirmation_code = secrets.token_urlsafe(16)

        return {
            "url": f"{FRONTEND_URL}/data-deletion?code={confirmation_code}",
            "confirmation_code": confirmation_code
        }
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid request"
        )


# =============================================================================
# CONNECTED ACCOUNTS
# =============================================================================

@router.get("/accounts")
async def get_connected_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all connected social media accounts for current user."""
    accounts = db.query(UserAccount).filter(
        UserAccount.user_id == current_user.id,
        UserAccount.is_verified == True,
        UserAccount.is_active == True
    ).all()

    return {
        "accounts": [
            {
                "id": acc.id,
                "platform": acc.platform.value,
                "username": acc.username,
                "display_name": acc.display_name,
                "avatar_url": acc.avatar_url,
                "connected_at": acc.oauth_connected_at.isoformat() if acc.oauth_connected_at else None,
                "is_token_valid": acc.oauth_token_expires_at > datetime.utcnow() if acc.oauth_token_expires_at else False
            }
            for acc in accounts
        ]
    }


@router.delete("/accounts/{account_id}")
async def disconnect_account(
    account_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disconnect a social media account."""
    account = db.query(UserAccount).filter(
        UserAccount.id == account_id,
        UserAccount.user_id == current_user.id
    ).first()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )

    # Clear OAuth tokens but keep the account record
    account.oauth_access_token = None
    account.oauth_refresh_token = None
    account.oauth_token_expires_at = None
    account.is_verified = False

    db.commit()

    return {"message": "Account disconnected successfully"}
