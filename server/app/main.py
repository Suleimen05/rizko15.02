# 1. --- ВАЖНО: ГРУЗИМ ПЕРЕМЕННЫЕ СРАЗУ ---
from dotenv import load_dotenv
import os
import sys

load_dotenv()

# --- Fix encoding for Windows console (emoji support) ---
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

# --- БЛОК ПРОВЕРКИ ---
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)-8s | %(name)s | %(message)s'
)
logger = logging.getLogger(__name__)

logger.info("=" * 60)
token = os.getenv("APIFY_API_TOKEN")
logger.info(f"Working Directory: {os.getcwd()}")
logger.info(f"APIFY TOKEN: {'FOUND' if token else 'MISSING (Check .env)'}")
logger.info("MODE: Enterprise Multi-Tenant with User Isolation")
logger.info("=" * 60)

# 2. --- ТЕПЕРЬ ОСТАЛЬНОЙ КОД ---
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import time
from pathlib import Path

from .core.database import Base, engine
from .core.config import settings

# Явный импорт моделей, чтобы SQLAlchemy их увидела!
from .db import models

# API Routers - Updated with new enterprise routes
from .api import trends, profiles, competitors, ai_scripts, proxy, favorites
from .api.routes import auth, oauth, feedback, usage
from .api import chat_sessions as chat_sessions_router
from .api import workflows as workflows_router
from .api import projects as projects_router
from .api import super_vision as super_vision_router

# Background Scheduler
from .services.scheduler import start_scheduler


# =============================================================================
# APP INITIALIZATION
# =============================================================================

app = FastAPI(
    title="Rizko.ai API",
    version=settings.VERSION,
    redirect_slashes=False,
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

# API Key protection for production
API_SECRET_KEY = os.getenv("API_SECRET_KEY", "")  # Set in .env for protection

@app.middleware("http")
async def api_key_middleware(request: Request, call_next):
    """Protect API with secret key in production."""
    # Skip CORS preflight requests (OPTIONS)
    if request.method == "OPTIONS":
        return await call_next(request)

    # Skip protection if no key is set (development) or for public endpoints
    public_paths = ["/", "/health", "/docs", "/redoc", "/openapi.json", "/api/auth/login", "/api/auth/register", "/api/auth/oauth/sync", "/api/proxy/image"]

    # Allow access to uploaded files (generated images)
    if request.url.path.startswith("/uploads/"):
        return await call_next(request)

    if API_SECRET_KEY and request.url.path not in public_paths:
        # Check for API key in header
        api_key = request.headers.get("X-API-Key")
        # Also allow via query param for OAuth callbacks
        if not api_key:
            api_key = request.query_params.get("api_key")

        # Skip check for OAuth callbacks (they use state for security)
        if "/oauth/" in request.url.path and "/callback" in request.url.path:
            return await call_next(request)

        # Skip if Authorization header present (JWT auth)
        if request.headers.get("Authorization"):
            return await call_next(request)

        # Skip if token in query (OAuth initiation)
        if request.query_params.get("token"):
            return await call_next(request)

        if api_key != API_SECRET_KEY:
            return JSONResponse(
                status_code=403,
                content={"detail": "Invalid or missing API key"}
            )

    return await call_next(request)


# CORS - Production-ready configuration
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "https://rizko.ai",
    "https://www.rizko.ai",
    "https://app.rizko.ai",
    "https://beta.rizko.ai",
    # Add Cloudflare Pages domains
    "https://*.pages.dev",
]

# For LOCAL development only — never on Railway/production
# Railway always sets RAILWAY_ENVIRONMENT, so this only triggers on localhost
if os.getenv("ENVIRONMENT", "development") == "development" and not os.getenv("RAILWAY_ENVIRONMENT"):
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
        logger.info(f"--> {request.method} {request.url.path}")

    response = await call_next(request)

    process_time = (time.time() - start_time) * 1000

    if request.url.path not in ["/", "/health", "/docs", "/redoc", "/openapi.json"]:
        logger.info(
            f"<-- {request.method} {request.url.path} "
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

# Feedback routes
app.include_router(
    feedback.router,
    prefix="/api",
    tags=["Feedback"]
)

# Usage routes (AI credits and statistics)
app.include_router(
    usage.router,
    prefix="/api"
)

# Chat Sessions routes (AI chat with multi-model support)
app.include_router(
    chat_sessions_router.router,
    prefix="/api/chat-sessions",
    tags=["Chat Sessions"]
)

# Workflows routes (node-based AI workflow execution)
app.include_router(
    workflows_router.router,
    prefix="/api/workflows",
    tags=["Workflows"]
)

# Projects routes (content strategy profiles)
app.include_router(
    projects_router.router,
    prefix="/api/projects",
    tags=["Projects"]
)

# Super Vision routes (automated AI-curated video discovery)
app.include_router(
    super_vision_router.router,
    prefix="/api/super-vision",
    tags=["Super Vision"]
)


# =============================================================================
# STATIC FILES (generated images)
# =============================================================================

UPLOADS_DIR = Path(__file__).parent.parent / "uploads" / "generated"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR.parent)), name="uploads")


# =============================================================================
# LIFECYCLE EVENTS
# =============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    logger.info("Starting Rizko.ai Backend...")

    # Fix VARCHAR(500) -> TEXT for columns that store TikTok CDN URLs (can be 700+ chars)
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE trends ALTER COLUMN play_addr TYPE TEXT"))
            conn.execute(text("ALTER TABLE trends ALTER COLUMN cover_url TYPE TEXT"))
            conn.execute(text("ALTER TABLE trends ALTER COLUMN url TYPE TEXT"))
            conn.commit()
            logger.info("Fixed play_addr, cover_url, url column types to TEXT")
    except Exception as e:
        logger.info(f"Column type fix skipped: {e}")

    # Create projects table and related columns (if not exist)
    try:
        from sqlalchemy import text as sa_text
        with engine.connect() as conn:
            # 1. Create projects table
            conn.execute(sa_text("""
                CREATE TABLE IF NOT EXISTS projects (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    name VARCHAR(255) NOT NULL,
                    icon VARCHAR(50),
                    status VARCHAR(20) NOT NULL DEFAULT 'active',
                    profile_data JSONB NOT NULL DEFAULT '{}',
                    raw_input JSONB NOT NULL DEFAULT '{}',
                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
                )
            """))
            # Index on user_id for fast lookups
            conn.execute(sa_text("""
                CREATE INDEX IF NOT EXISTS ix_projects_user_id ON projects(user_id)
            """))

            # 2. Create project_video_scores table
            conn.execute(sa_text("""
                CREATE TABLE IF NOT EXISTS project_video_scores (
                    id SERIAL PRIMARY KEY,
                    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                    video_platform_id VARCHAR(100) NOT NULL,
                    score INTEGER NOT NULL DEFAULT 0,
                    reason VARCHAR(255),
                    scored_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    UNIQUE(project_id, video_platform_id)
                )
            """))
            # Add reason column if missing (migration fix)
            conn.execute(sa_text("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'project_video_scores' AND column_name = 'reason'
                    ) THEN
                        ALTER TABLE project_video_scores ADD COLUMN reason VARCHAR(255);
                    END IF;
                END $$
            """))
            conn.execute(sa_text("""
                CREATE INDEX IF NOT EXISTS ix_project_video_scores_project_id ON project_video_scores(project_id)
            """))
            conn.execute(sa_text("""
                CREATE INDEX IF NOT EXISTS ix_project_video_scores_video_platform_id ON project_video_scores(video_platform_id)
            """))

            # 3. Add project_id FK to user_favorites (nullable, SET NULL on delete)
            conn.execute(sa_text("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'user_favorites' AND column_name = 'project_id'
                    ) THEN
                        ALTER TABLE user_favorites ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL;
                    END IF;
                END $$
            """))

            # 4. Add project_id FK to competitors (nullable, SET NULL on delete)
            conn.execute(sa_text("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'competitors' AND column_name = 'project_id'
                    ) THEN
                        ALTER TABLE competitors ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL;
                    END IF;
                END $$
            """))

            conn.commit()
            logger.info("Projects tables and columns created/verified successfully")
    except Exception as e:
        logger.warning(f"Projects migration skipped or failed: {e}")

    # --- Super Vision tables migration ---
    try:
        with engine.connect() as conn:
            # 1. Create super_vision_configs table
            conn.execute(sa_text("""
                CREATE TABLE IF NOT EXISTS super_vision_configs (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    project_id INTEGER NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
                    status VARCHAR(20) NOT NULL DEFAULT 'paused',
                    min_views INTEGER NOT NULL DEFAULT 500000,
                    date_range_days INTEGER NOT NULL DEFAULT 7,
                    platform VARCHAR(20) NOT NULL DEFAULT 'tiktok',
                    scan_interval_hours INTEGER NOT NULL DEFAULT 12,
                    max_vision_videos INTEGER NOT NULL DEFAULT 5,
                    custom_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
                    text_score_threshold INTEGER NOT NULL DEFAULT 70,
                    last_run_at TIMESTAMP,
                    next_run_at TIMESTAMP,
                    last_run_status VARCHAR(50),
                    last_run_stats JSONB NOT NULL DEFAULT '{}'::jsonb,
                    scheduler_job_id VARCHAR(100),
                    consecutive_errors INTEGER NOT NULL DEFAULT 0,
                    last_error TEXT,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
                )
            """))
            conn.execute(sa_text("""
                CREATE INDEX IF NOT EXISTS ix_sv_configs_user_id ON super_vision_configs(user_id)
            """))
            conn.execute(sa_text("""
                CREATE INDEX IF NOT EXISTS ix_sv_configs_project_id ON super_vision_configs(project_id)
            """))
            conn.execute(sa_text("""
                CREATE INDEX IF NOT EXISTS ix_sv_configs_user_status ON super_vision_configs(user_id, status)
            """))
            conn.execute(sa_text("""
                CREATE INDEX IF NOT EXISTS ix_sv_configs_next_run ON super_vision_configs(status, next_run_at)
            """))

            # 2. Create super_vision_results table
            conn.execute(sa_text("""
                CREATE TABLE IF NOT EXISTS super_vision_results (
                    id SERIAL PRIMARY KEY,
                    config_id INTEGER NOT NULL REFERENCES super_vision_configs(id) ON DELETE CASCADE,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                    video_platform_id VARCHAR(100) NOT NULL,
                    video_url TEXT NOT NULL,
                    video_cover_url TEXT,
                    video_play_addr TEXT,
                    video_description TEXT,
                    video_author VARCHAR(100),
                    video_stats JSONB NOT NULL DEFAULT '{}'::jsonb,
                    text_score INTEGER NOT NULL DEFAULT 0,
                    text_reason VARCHAR(255),
                    vision_score INTEGER,
                    vision_analysis TEXT,
                    vision_match_reason VARCHAR(500),
                    final_score INTEGER NOT NULL DEFAULT 0,
                    scan_batch_id VARCHAR(50) NOT NULL,
                    is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
                    is_saved BOOLEAN NOT NULL DEFAULT FALSE,
                    found_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    UNIQUE(config_id, video_platform_id)
                )
            """))
            conn.execute(sa_text("""
                CREATE INDEX IF NOT EXISTS ix_sv_results_config_id ON super_vision_results(config_id)
            """))
            conn.execute(sa_text("""
                CREATE INDEX IF NOT EXISTS ix_sv_results_user_id ON super_vision_results(user_id)
            """))
            conn.execute(sa_text("""
                CREATE INDEX IF NOT EXISTS ix_sv_results_project_id ON super_vision_results(project_id)
            """))
            conn.execute(sa_text("""
                CREATE INDEX IF NOT EXISTS ix_sv_results_project_score ON super_vision_results(project_id, final_score)
            """))
            conn.execute(sa_text("""
                CREATE INDEX IF NOT EXISTS ix_sv_results_user_found ON super_vision_results(user_id, found_at)
            """))

            conn.commit()
            logger.info("Super Vision tables created/verified successfully")
    except Exception as e:
        logger.warning(f"Super Vision migration skipped or failed: {e}")

    # Start background scheduler for auto-rescan
    try:
        logger.info("Initializing Background Scheduler...")
        start_scheduler()
        logger.info("Scheduler is running and waiting for tasks.")
    except Exception as e:
        logger.warning(f"Scheduler initialization failed: {e}")
        logger.warning("Continuing without scheduler - auto-rescan will be disabled")

    # Restore active Super Vision scheduled jobs
    try:
        from .services.super_vision_pipeline import restore_active_scans
        restore_active_scans()
        logger.info("Super Vision scheduled jobs restored")
    except Exception as e:
        logger.warning(f"Super Vision restore skipped: {e}")

    logger.info("Rizko.ai Backend started successfully!")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    logger.info("Shutting down Rizko.ai Backend...")


# =============================================================================
# HEALTH & INFO ENDPOINTS
# =============================================================================

@app.get("/", tags=["Health"])
def root():
    """Root endpoint - returns API info."""
    return {
        "name": "Rizko.ai API",
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
        "name": "Rizko.ai API",
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

    port = int(os.getenv("PORT", 8000))
    is_dev = os.getenv("ENVIRONMENT", "development") == "development"

    logger.info(f"Starting Rizko.ai Backend on http://0.0.0.0:{port}")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=is_dev,  # Only reload in development, not in production containers
    )
