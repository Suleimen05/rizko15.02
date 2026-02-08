"""
AI Script Generation API with Credits Integration
Generates viral TikTok scripts using Google Gemini with usage tracking
"""
import logging
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from ..services.gemini_script_generator import GeminiScriptGenerator
from ..core.database import get_db
from ..db.models import User, UserScript, ChatMessage, UserSettings
from ..api.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()  # Prefix and tags defined in main.py

# Initialize Gemini generator
script_generator = GeminiScriptGenerator()

# AI Model costs (in credits)
MODEL_COSTS = {
    "gemini-flash": 0,      # Free tier - unlimited
    "gemini-pro": 3,        # Creator+ tier
    "gpt-4o": 10,           # Pro+ tier (future)
    "claude-3.5": 8,        # Pro+ tier (future)
}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def check_credits(user: User, cost: int, db: Session) -> bool:
    """
    Check if user has enough credits for the operation.

    Deduction order:
    1. Monthly credits
    2. Rollover credits
    3. Bonus credits
    """
    total_available = (
        (user.monthly_credits_limit - user.monthly_credits_used) +
        user.rollover_credits +
        user.bonus_credits
    )

    return total_available >= cost


def deduct_credits(user: User, cost: int, db: Session):
    """
    Deduct credits from user account in correct order.

    Priority: monthly → rollover → bonus
    """
    remaining = cost

    # 1. Deduct from monthly credits first
    monthly_available = user.monthly_credits_limit - user.monthly_credits_used
    if monthly_available > 0:
        deduction = min(remaining, monthly_available)
        user.monthly_credits_used += deduction
        remaining -= deduction

    # 2. Then from rollover
    if remaining > 0 and user.rollover_credits > 0:
        deduction = min(remaining, user.rollover_credits)
        user.rollover_credits -= deduction
        remaining -= deduction

    # 3. Finally from bonus
    if remaining > 0 and user.bonus_credits > 0:
        deduction = min(remaining, user.bonus_credits)
        user.bonus_credits -= deduction
        remaining -= deduction

    db.commit()

    logger.info(
        f"Deducted {cost} credits from user {user.id}. "
        f"Remaining: {user.monthly_credits_limit - user.monthly_credits_used} monthly, "
        f"{user.rollover_credits} rollover, {user.bonus_credits} bonus"
    )


def select_model(user: User, settings: UserSettings, task_complexity: str = "simple") -> tuple[str, int]:
    """
    Select AI model based on Auto Mode settings and task complexity.

    Returns: (model_name, cost_in_credits)

    Auto Mode Logic:
    - Simple tasks → Gemini Flash (0 credits)
    - Complex tasks → Gemini Pro (3 credits) if user has Creator+ plan
    - If Auto Mode OFF → Always use best available model
    """
    plan = user.subscription_tier.value
    auto_mode = settings.ai_auto_mode if settings else True

    # Free tier: always Flash
    if plan == "free":
        return ("gemini-flash", 0)

    # Auto Mode enabled: smart selection
    if auto_mode:
        if task_complexity == "simple":
            return ("gemini-flash", 0)  # Save credits!
        else:
            return ("gemini-pro", 3)    # Quality for complex tasks

    # Auto Mode disabled: always best model
    return ("gemini-pro", 3)


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

class ScriptRequest(BaseModel):
    """Request to generate a script"""
    video_description: str = Field(..., description="Video description")
    video_stats: Dict[str, int] = Field(
        default={
            "playCount": 0,
            "diggCount": 0,
            "commentCount": 0,
            "shareCount": 0
        },
        description="Video statistics"
    )
    tone: str = Field(default="engaging", description="Script tone")
    niche: str = Field(default="general", description="Content niche")
    duration_seconds: int = Field(default=30, ge=10, le=180, description="Duration in seconds")


class ScriptResponse(BaseModel):
    """Script generation response"""
    hook: str
    body: list[str]
    cta: str
    viralElements: list[str]
    tips: list[str]
    duration: int
    generatedAt: str
    fallback: Optional[bool] = None
    credits_used: int = Field(..., description="Credits used for this generation")
    model_used: str = Field(..., description="AI model used")


class ChatRequest(BaseModel):
    """AI chat request"""
    message: str = Field(..., description="User message")
    context: str = Field(default="", description="Video context")
    history: list[Dict[str, str]] = Field(default=[], description="Chat history")
    model: str = Field(default="gemini", description="AI model")
    mode: str = Field(default="script", description="Mode: script, ideas, analysis, improve, hook")


class ChatResponse(BaseModel):
    """AI chat response"""
    response: str
    credits_used: int = Field(..., description="Credits used")
    model_used: str = Field(..., description="AI model used")


# System prompts for different modes
MODE_PROMPTS = {
    "script": """You are an expert viral TikTok script writer. Create engaging, hook-driven scripts that capture attention in the first 3 seconds.
Format your response with:
1. **Hook** (first 3 seconds)
2. **Body** (main content, bullet points)
3. **Call to Action**
4. **Pro Tips** for maximum engagement""",

    "ideas": """You are a creative TikTok content strategist. Generate unique, trending video ideas that have viral potential.
For each idea include:
- Video concept
- Why it could go viral
- Best posting time
- Suggested hashtags""",

    "analysis": """You are a TikTok analytics expert. Analyze trends, content strategies, and viral mechanics.
Provide insights on:
- What makes content successful
- Audience behavior patterns
- Growth opportunities
- Competitor strategies""",

    "improve": """You are a content optimization specialist. Take existing scripts/content and make them more engaging and viral.
Focus on:
- Stronger hooks
- Better pacing
- More emotional triggers
- Clearer call-to-action""",

    "hook": """You are a hook specialist. Create attention-grabbing opening lines that stop the scroll.
Provide:
- 5 different hook variations
- Why each works psychologically
- Best delivery tips"""
}


# =============================================================================
# API ENDPOINTS
# =============================================================================

@router.post("/generate", response_model=ScriptResponse)
async def generate_script(
    request: ScriptRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> ScriptResponse:
    """
    Generate viral TikTok script with credits tracking.

    - Checks user credits before generation
    - Uses Auto Mode to select optimal model
    - Deducts credits after successful generation
    - Saves script to database for stats tracking
    """
    try:
        # Get user settings for Auto Mode
        settings = db.query(UserSettings).filter(
            UserSettings.user_id == current_user.id
        ).first()

        # Determine task complexity (simple heuristic)
        desc_length = len(request.video_description.split())
        task_complexity = "complex" if desc_length > 50 else "simple"

        # Select model based on Auto Mode
        model_name, cost = select_model(current_user, settings, task_complexity)

        # Check if user has enough credits
        if not check_credits(current_user, cost, db):
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Insufficient credits. Need {cost}, but you have "
                       f"{(current_user.monthly_credits_limit - current_user.monthly_credits_used) + current_user.rollover_credits + current_user.bonus_credits} available."
            )

        # Generate script
        script = script_generator.generate_script(
            video_description=request.video_description,
            video_stats=request.video_stats,
            tone=request.tone,
            niche=request.niche,
            duration_seconds=request.duration_seconds
        )

        if not script:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate script"
            )

        # Deduct credits
        deduct_credits(current_user, cost, db)

        # Save to database for tracking
        db_script = UserScript(
            user_id=current_user.id,
            title=f"Script for: {request.video_description[:50]}...",
            hook=script.get("hook", ""),
            body=script.get("body", []),
            call_to_action=script.get("cta", ""),
            metadata={
                "tone": request.tone,
                "niche": request.niche,
                "duration": request.duration_seconds,
                "model_used": model_name,
                "credits_used": cost
            },
            created_at=datetime.utcnow()
        )
        db.add(db_script)
        db.commit()

        logger.info(
            f"User {current_user.id} generated script using {model_name} "
            f"(cost: {cost} credits, auto_mode: {settings.ai_auto_mode if settings else True})"
        )

        # Return response with credits info
        return ScriptResponse(
            **script,
            credits_used=cost,
            model_used=model_name
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Script generation error for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Script generation failed: {str(e)}"
        )


@router.post("/chat", response_model=ChatResponse)
async def ai_chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> ChatResponse:
    """
    AI Creator chat with credits tracking.

    - Uses Auto Mode for model selection
    - Saves conversation to database
    - Tracks credits usage
    """
    try:
        # Get user settings
        settings = db.query(UserSettings).filter(
            UserSettings.user_id == current_user.id
        ).first()

        # Determine complexity based on message length
        msg_length = len(request.message.split())
        task_complexity = "complex" if msg_length > 30 else "simple"

        # Select model
        model_name, cost = select_model(current_user, settings, task_complexity)

        # Check credits
        if not check_credits(current_user, cost, db):
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Insufficient credits. Need {cost} credits."
            )

        # Build conversation history
        history_text = ""
        for msg in request.history[-6:]:
            role = "User" if msg.get("role") == "user" else "Assistant"
            history_text += f"{role}: {msg.get('content', '')}\n"

        # Get mode-specific system prompt
        system_prompt = MODE_PROMPTS.get(request.mode, MODE_PROMPTS["script"])

        prompt = f"""{system_prompt}

CONVERSATION HISTORY:
{history_text}

USER REQUEST: {request.message}

Respond in a helpful, structured way. Use markdown formatting (bold, bullets, headers) for readability.
Keep the response focused and actionable. Language: respond in the same language as the user's message."""

        # Generate response
        response = script_generator.client.models.generate_content(
            model="gemini-2.0-flash" if model_name == "gemini-flash" else "gemini-2.0-pro",
            contents=prompt
        )

        ai_response = response.text.strip() if response.text else "I couldn't generate a response. Please try again."

        # Deduct credits
        deduct_credits(current_user, cost, db)

        # Save to database
        session_id = str(uuid.uuid4())

        # Save user message
        user_msg = ChatMessage(
            user_id=current_user.id,
            session_id=session_id,
            role="user",
            content=request.message,
            metadata={"mode": request.mode},
            created_at=datetime.utcnow()
        )
        db.add(user_msg)

        # Save assistant response
        assistant_msg = ChatMessage(
            user_id=current_user.id,
            session_id=session_id,
            role="assistant",
            content=ai_response,
            metadata={
                "model_used": model_name,
                "credits_used": cost
            },
            created_at=datetime.utcnow()
        )
        db.add(assistant_msg)
        db.commit()

        logger.info(
            f"User {current_user.id} sent chat message using {model_name} "
            f"(cost: {cost} credits)"
        )

        return ChatResponse(
            response=ai_response,
            credits_used=cost,
            model_used=model_name
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI chat error for user {current_user.id}: {e}")
        return ChatResponse(
            response="Sorry, I encountered an error. Please try again.",
            credits_used=0,
            model_used="error"
        )


@router.get("/health")
def health_check():
    """Check AI Script Generator health"""
    return {
        "status": "ok",
        "service": "AI Script Generator (Credits Integrated)",
        "models": {
            "gemini-flash": f"{MODEL_COSTS['gemini-flash']} credits",
            "gemini-pro": f"{MODEL_COSTS['gemini-pro']} credits"
        },
        "available": script_generator.client is not None
    }
