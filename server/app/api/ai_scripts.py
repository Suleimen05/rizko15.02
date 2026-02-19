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
from ..db.models import User, UserScript, ChatMessage, UserSettings, Project
from ..api.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()  # Prefix and tags defined in main.py

# Lazy init Gemini generator (avoid import-time crash)
_script_generator = None

def _get_generator() -> GeminiScriptGenerator:
    global _script_generator
    if _script_generator is None:
        _script_generator = GeminiScriptGenerator()
    return _script_generator

# AI Model costs (in credits)
MODEL_COSTS = {
    "gemini-flash": 0,      # Free tier - unlimited
    "gemini-pro": 3,        # Creator+ tier
    "nano-bana": 2,         # Image generation
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
    language: str = Field(default="English", description="Response language")
    project_id: Optional[int] = Field(default=None, description="Project ID for personalization")


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
- Best delivery tips""",

    "chat": """You are a friendly and helpful AI assistant. Have a natural conversation with the user. Answer their questions directly and concisely. Do not format responses as scripts, hooks, or content strategies unless the user specifically asks for that.""",

    "prompt-enhancer": """You are a world-class Prompt Engineer. You take a rough idea and turn it into a perfect, professional prompt.

YOUR PROCESS HAS EXACTLY 2 MESSAGES:

=== YOUR FIRST REPLY (after user's idea) ===
Output EXACTLY 5 open-ended clarifying questions. These questions must:
- Deeply understand WHAT the user truly wants to achieve
- Be open-ended so the user can express their vision freely
- Cover: goal/vision, style/mood, specific details, technical requirements, context of use
- Be tailored to the user's specific topic (NOT generic questions)
No greeting. No intro. No explanation. ONLY the 5 numbered questions.

=== YOUR SECOND REPLY (after user answers) ===
Generate a POWERFUL, DETAILED prompt that is ready to copy-paste into any AI. The prompt must:
- Be 150-300 words long
- Start with a clear role/persona assignment
- Include ALL specifics from user's answers
- Define exact style, mood, composition, lighting, colors, perspective
- Specify technical details (resolution, format, aspect ratio if applicable)
- Include negative constraints (what to avoid)
- Use professional prompt engineering structure

Format your second reply as:

🎯 **Enhanced Prompt:**
[the full detailed prompt here]

📝 **Key improvements:**
- [what was added/enhanced vs the original rough idea]
- [...]
- [...]

ABSOLUTE RULES:
1. You ask questions ONLY ONCE — in your first reply
2. After user answers, you IMMEDIATELY output the final prompt — NO MORE QUESTIONS EVER
3. The final prompt must be significantly better and more detailed than the user's original idea
4. If the conversation history already contains your questions AND user's answers, skip to generating the final prompt"""
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
        script = _get_generator().generate_script(
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
            tone=request.tone,
            niche=request.niche,
            duration_seconds=request.duration_seconds,
            model_used=model_name,
            viral_elements=script.get("viralElements", []),
            tips=script.get("tips", []),
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

        # Determine cost based on model
        if request.model == "nano-bana":
            model_name = "nano-bana"
            cost = MODEL_COSTS.get("nano-bana", 2)
        else:
            msg_length = len(request.message.split())
            task_complexity = "complex" if msg_length > 30 else "simple"
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

        # Add language instruction
        lang_instruction = ""
        if request.language and request.language.lower() != "english":
            lang_instruction = f"IMPORTANT: You MUST respond entirely in {request.language}. All text, headings, and content must be in {request.language}.\n\n"

        # Inject project context if project_id provided
        project_context = ""
        if request.project_id:
            project = db.query(Project).filter(
                Project.id == request.project_id,
                Project.user_id == current_user.id
            ).first()
            if project and project.profile_data:
                p = project.profile_data
                audience = p.get('audience', {})
                audience_str = f"Age: {audience.get('age', 'N/A')}, Gender: {audience.get('gender', 'N/A')}, Interests: {', '.join(audience.get('interests', []))}"
                project_context = f"""PROJECT CONTEXT (personalize ALL responses for this project):
- Niche: {p.get('niche', 'N/A')} / {p.get('sub_niche', '')}
- Content format: {', '.join(p.get('format', []))}
- Target audience: {audience_str}
- Tone/style: {p.get('tone', '')}
- Platforms: {', '.join(p.get('platforms', []))}
- MUST AVOID: {', '.join(p.get('exclude', []))}

Tailor ALL responses specifically for this project's audience and style.

"""

        prompt = f"""{lang_instruction}{project_context}{system_prompt}

CONVERSATION HISTORY:
{history_text}

USER REQUEST: {request.message}

Respond in a helpful, structured way. Use markdown formatting (bold, bullets, headers) for readability.
Keep the response focused and actionable."""

        # Handle image generation for nano-bana model
        if request.model == "nano-bana":
            try:
                from google.genai import types
                from pathlib import Path
                import uuid as _uuid

                gen = _get_generator()
                if gen.client is None:
                    raise Exception("Gemini API not initialized")

                uploads_dir = Path(__file__).parent.parent.parent / "uploads" / "generated"
                uploads_dir.mkdir(parents=True, exist_ok=True)

                # Try image generation models in order of preference
                image_models = ["gemini-2.0-flash-exp-image-generation", "gemini-2.5-flash-image"]
                img_response = None
                for img_model in image_models:
                    try:
                        img_response = gen.client.models.generate_content(
                            model=img_model,
                            contents=request.message,
                            config=types.GenerateContentConfig(
                                response_modalities=["Text", "Image"]
                            )
                        )
                        if img_response.candidates:
                            print(f"[AI] Image generated with model: {img_model}")
                            break
                    except Exception as model_err:
                        print(f"[AI] Model {img_model} failed: {model_err}")
                        continue

                if not img_response or not img_response.candidates:
                    raise Exception("All image models failed")

                result_parts = []
                for part in img_response.candidates[0].content.parts:
                    if hasattr(part, 'inline_data') and part.inline_data:
                        ext = "png" if "png" in (part.inline_data.mime_type or "") else "jpg"
                        filename = f"{_uuid.uuid4().hex}.{ext}"
                        filepath = uploads_dir / filename
                        filepath.write_bytes(part.inline_data.data)
                        img_url = f"/uploads/generated/{filename}"
                        result_parts.append(f"![Generated Image]({img_url})")
                        print(f"[AI] Image saved: {filepath} ({len(part.inline_data.data)} bytes)")
                    elif hasattr(part, 'text') and part.text:
                        result_parts.append(part.text.strip())

                # Ensure there's always text with the image
                has_text = any(not p.startswith("![") for p in result_parts)
                has_image = any(p.startswith("![") for p in result_parts)
                if has_image and not has_text:
                    result_parts.insert(0, "Вот сгенерированное изображение по вашему запросу:")
                ai_response = "\n\n".join(result_parts) if result_parts else "Не удалось сгенерировать изображение. Попробуйте более подробный запрос."
            except Exception as img_err:
                print(f"[AI] Nano Bana error: {img_err}")
                ai_response = f"Ошибка генерации изображения: {str(img_err)}"
        else:
            # Generate text response
            response = _get_generator().client.models.generate_content(
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
            mode=request.mode,
            created_at=datetime.utcnow()
        )
        db.add(user_msg)

        # Save assistant response
        assistant_msg = ChatMessage(
            user_id=current_user.id,
            session_id=session_id,
            role="assistant",
            content=ai_response,
            model=model_name,
            mode=request.mode,
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
        "available": _get_generator().client is not None
    }
