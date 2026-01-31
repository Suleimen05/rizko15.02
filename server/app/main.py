# 1. --- ВАЖНО: ГРУЗИМ ПЕРЕМЕННЫЕ СРАЗУ ---
from dotenv import load_dotenv
import os

load_dotenv()

# --- БЛОК ПРОВЕРКИ ---
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)-8s | %(name)s | %(message)s'
)
logger = logging.getLogger(__name__)

logger.info("=" * 60)
token = os.getenv("APIFY_API_TOKEN")
logger.info(f"📂 Working Directory: {os.getcwd()}")
logger.info(f"🔑 APIFY TOKEN: {'✅ FOUND' if token else '❌ MISSING (Check .env)'}")
logger.info("🚀 MODE: Enterprise Multi-Tenant with User Isolation")
logger.info("=" * 60)

# 2. --- ТЕПЕРЬ ОСТАЛЬНОЙ КОД ---
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time

from .core.database import Base, engine
from .core.config import settings

# Явный импорт моделей, чтобы SQLAlchemy их увидела!
from .db import models

# API Routers - Updated with new enterprise routes
from .api import trends, profiles, competitors, ai_scripts, proxy, favorites
from .api.routes import auth, oauth

# Background Scheduler
from .services.scheduler import start_scheduler


# =============================================================================
# APP INITIALIZATION
# =============================================================================

app = FastAPI(
    title="Risko.ai API",
    version=settings.VERSION,
    description="""
## TikTok Trend Analysis Platform

Enterprise-grade API for:
- 🔍 Trend Discovery with 6-Layer UTS Scoring
- 📊 Deep Analyze (Pro/Agency)
- 👥 Competitor Tracking
- 🤖 AI Script Generation
- ⭐ User Favorites & Collections

**Authentication**: All endpoints require JWT Bearer token (except /health)

**Rate Limits**: Based on subscription tier (Free: 10/min, Pro: 100/min)
    """,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {"name": "Auth", "description": "Authentication & User Management"},
        {"name": "Trends", "description": "Trend Search & Analysis"},
        {"name": "Favorites", "description": "User Bookmarks/Favorites"},
        {"name": "Competitors", "description": "Competitor Tracking & Spy Mode"},
        {"name": "Profiles", "description": "TikTok Profile Analysis"},
        {"name": "AI Scripts", "description": "AI-Powered Script Generation"},
    ]
)


# =============================================================================
# MIDDLEWARE
# =============================================================================

# CORS - Production-ready configuration
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "https://risko.ai",
    "https://www.risko.ai",
    "https://app.risko.ai",
    # Add Cloudflare Pages domains
    "https://*.pages.dev",
]

# For development, allow all origins
if os.getenv("ENVIRONMENT", "development") == "development":
    ALLOWED_ORIGINS = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests with timing."""
    start_time = time.time()

    # Skip logging for health check and docs
    if request.url.path not in ["/", "/health", "/docs", "/redoc", "/openapi.json"]:
        logger.info(f"➡️  {request.method} {request.url.path}")

    response = await call_next(request)

    process_time = (time.time() - start_time) * 1000

    if request.url.path not in ["/", "/health", "/docs", "/redoc", "/openapi.json"]:
        logger.info(
            f"⬅️  {request.method} {request.url.path} "
            f"| Status: {response.status_code} "
            f"| Time: {process_time:.2f}ms"
        )

    # Add custom headers
    response.headers["X-Process-Time"] = f"{process_time:.2f}ms"

    return response


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all unhandled exceptions and return proper JSON response."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)

    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if os.getenv("ENVIRONMENT") == "development" else "An unexpected error occurred",
            "path": str(request.url.path)
        }
    )


# =============================================================================
# ROUTES
# =============================================================================

# Authentication routes
app.include_router(
    auth.router,
    prefix="/api/auth",
    tags=["Auth"]
)

# Trend routes (with user isolation)
app.include_router(
    trends.router,
    prefix="/api/trends",
    tags=["Trends"]
)

# Favorites routes (new!)
app.include_router(
    favorites.router,
    prefix="/api/favorites",
    tags=["Favorites"]
)

# Profile routes
app.include_router(
    profiles.router,
    prefix="/api/profiles",
    tags=["Profiles"]
)

# Competitor routes (with user isolation)
app.include_router(
    competitors.router,
    prefix="/api/competitors",
    tags=["Competitors"]
)

# AI Scripts routes
app.include_router(
    ai_scripts.router,
    prefix="/api/ai-scripts",
    tags=["AI Scripts"]
)

# Proxy routes (for image/video proxying)
app.include_router(
    proxy.router,
    prefix="/api/proxy",
    tags=["Proxy"]
)

# OAuth routes (for social media account connections)
app.include_router(
    oauth.router,
    prefix="/api/oauth",
    tags=["OAuth"]
)


# =============================================================================
# LIFECYCLE EVENTS
# =============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    logger.info("🚀 Starting Risko.ai Backend...")

    # Start background scheduler for auto-rescan
    try:
        logger.info("⏳ Initializing Background Scheduler...")
        start_scheduler()
        logger.info("✅ Scheduler is running and waiting for tasks.")
    except Exception as e:
        logger.warning(f"⚠️  Scheduler initialization failed: {e}")
        logger.warning("⚠️  Continuing without scheduler - auto-rescan will be disabled")

    logger.info("✅ Risko.ai Backend started successfully!")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    logger.info("🛑 Shutting down Risko.ai Backend...")


# =============================================================================
# HEALTH & INFO ENDPOINTS
# =============================================================================

@app.get("/", tags=["Health"])
def root():
    """Root endpoint - returns API info."""
    return {
        "name": "Risko.ai API",
        "version": settings.VERSION,
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health", tags=["Health"])
def health_check():
    """
    Health check endpoint for monitoring.

    Returns:
        - API status
        - Version info
        - Feature flags
        - Database status
    """
    return {
        "status": "healthy",
        "version": settings.VERSION,
        "engine": "6-layer-math-v2",
        "features": {
            "user_isolation": True,
            "deep_analyze": True,
            "clustering": True,
            "auto_rescan": True,
            "favorites": True,
            "rate_limiting": True
        },
        "database": "PostgreSQL",
        "environment": os.getenv("ENVIRONMENT", "development")
    }


@app.get("/api/info", tags=["Health"])
def api_info():
    """Get API information and available endpoints."""
    return {
        "name": "Risko.ai API",
        "version": settings.VERSION,
        "description": "TikTok Trend Analysis Platform with User Isolation",
        "endpoints": {
            "auth": {
                "register": "POST /api/auth/register",
                "login": "POST /api/auth/login",
                "me": "GET /api/auth/me",
                "refresh": "POST /api/auth/refresh"
            },
            "trends": {
                "search": "POST /api/trends/search",
                "results": "GET /api/trends/results",
                "my_trends": "GET /api/trends/my-trends",
                "limits": "GET /api/trends/limits"
            },
            "favorites": {
                "list": "GET /api/favorites/",
                "add": "POST /api/favorites/",
                "update": "PATCH /api/favorites/{id}",
                "delete": "DELETE /api/favorites/{id}"
            },
            "competitors": {
                "list": "GET /api/competitors/",
                "add": "POST /api/competitors/",
                "spy": "GET /api/competitors/{username}/spy",
                "refresh": "PUT /api/competitors/{username}/refresh"
            },
            "profiles": {
                "get": "GET /api/profiles/{username}"
            },
            "ai_scripts": {
                "generate": "POST /api/ai-scripts/generate",
                "chat": "POST /api/ai-scripts/chat"
            }
        },
        "rate_limits": {
            "free": "10 req/min",
            "creator": "30 req/min",
            "pro": "100 req/min",
            "agency": "500 req/min"
        },
        "deep_analyze_limits": {
            "free": "Not available",
            "creator": "Not available",
            "pro": "20/day",
            "agency": "100/day"
        }
    }


if __name__ == "__main__":
    import uvicorn

    logger.info("🔥 Starting Risko.ai Backend on http://0.0.0.0:8000")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
