"""
AI Script Generation API
Generates viral TikTok scripts using Google Gemini Flash
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

from ..services.gemini_script_generator import GeminiScriptGenerator

router = APIRouter()

# Инициализируем генератор
script_generator = GeminiScriptGenerator()


class ScriptRequest(BaseModel):
    """Запрос на генерацию скрипта"""
    video_description: str = Field(..., description="Описание видео")
    video_stats: Dict[str, int] = Field(
        default={
            "playCount": 0,
            "diggCount": 0,
            "commentCount": 0,
            "shareCount": 0
        },
        description="Статистика видео"
    )
    tone: str = Field(default="engaging", description="Тон скрипта: engaging, educational, humorous, inspirational")
    niche: str = Field(default="general", description="Ниша контента")
    duration_seconds: int = Field(default=30, ge=10, le=180, description="Длительность в секундах")


class ScriptResponse(BaseModel):
    """Ответ с сгенерированным скриптом"""
    hook: str
    body: list[str]
    cta: str
    viralElements: list[str]
    tips: list[str]
    duration: int
    generatedAt: str
    fallback: Optional[bool] = None


@router.post("/generate")
def generate_script(request: ScriptRequest) -> ScriptResponse:
    """
    Генерирует вирусный скрипт для TikTok видео

    - **video_description**: Описание оригинального видео
    - **video_stats**: Статистика (views, likes, comments, shares)
    - **tone**: Тон скрипта (engaging, educational, humorous, inspirational)
    - **niche**: Ниша контента
    - **duration_seconds**: Длительность видео
    """
    try:
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

        return ScriptResponse(**script)

    except Exception as e:
        print(f"❌ Script generation API error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Script generation failed: {str(e)}"
        )


class ChatRequest(BaseModel):
    """Запрос на AI чат"""
    message: str = Field(..., description="Сообщение пользователя")
    context: str = Field(default="", description="Контекст видео")
    history: list[Dict[str, str]] = Field(default=[], description="История чата")
    model: str = Field(default="gemini", description="AI модель")
    mode: str = Field(default="script", description="Режим: script, ideas, analysis, improve, hook")


class ChatResponse(BaseModel):
    """Ответ AI чата"""
    response: str


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


@router.post("/chat")
def ai_chat(request: ChatRequest) -> ChatResponse:
    """
    AI Creator чат - генерация контента с Gemini

    - **message**: Запрос пользователя
    - **history**: История чата
    - **mode**: Режим (script, ideas, analysis, improve, hook)
    """
    try:
        # Build conversation history
        history_text = ""
        for msg in request.history[-6:]:  # Last 6 messages
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

        response = script_generator.client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )

        ai_response = response.text.strip() if response.text else "I couldn't generate a response. Please try again."

        return ChatResponse(response=ai_response)

    except Exception as e:
        print(f"❌ AI Chat error: {e}")
        return ChatResponse(
            response="Sorry, I encountered an error. Please try again."
        )


@router.get("/health")
def health_check():
    """Проверка работы AI Script Generator"""
    return {
        "status": "ok",
        "service": "AI Script Generator",
        "model": "Google Gemini Flash",
        "available": script_generator.client is not None
    }
