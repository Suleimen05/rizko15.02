# backend/app/api/chat_sessions.py
# Updated: pin support
"""
Chat Sessions API
Manages AI chat sessions and message history for users.
Supports multiple AI providers: Gemini, Claude, GPT
"""
import os
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..core.database import get_db
from ..db.models import User, ChatSession, ChatMessage, Project
from .dependencies import get_current_user, CreditManager

router = APIRouter(tags=["Chat Sessions"])

# =============================================================================
# AI CLIENTS - Lazy initialization
# =============================================================================

_gemini_client = None
_anthropic_client = None
_openai_client = None

def get_gemini_client():
    """Get or create Gemini client"""
    global _gemini_client
    if _gemini_client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            try:
                from google import genai
                _gemini_client = genai.Client(api_key=api_key)
                print("[AI] Gemini client initialized")
            except Exception as e:
                print(f"[AI] Failed to initialize Gemini: {e}")
    return _gemini_client

def get_anthropic_client():
    """Get or create Anthropic (Claude) client"""
    global _anthropic_client
    if _anthropic_client is None:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if api_key and not api_key.startswith("your-"):
            try:
                import anthropic
                _anthropic_client = anthropic.Anthropic(api_key=api_key)
                print("[AI] Anthropic client initialized")
            except Exception as e:
                print(f"[AI] Failed to initialize Anthropic: {e}")
    return _anthropic_client

def get_openai_client():
    """Get or create OpenAI client"""
    global _openai_client
    if _openai_client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key and not api_key.startswith("your-"):
            try:
                from openai import OpenAI
                _openai_client = OpenAI(api_key=api_key)
                print("[AI] OpenAI client initialized")
            except Exception as e:
                print(f"[AI] Failed to initialize OpenAI: {e}")
    return _openai_client


async def generate_ai_response(model: str, system_prompt: str, user_message: str, history_text: str = "", mode: str = "") -> str:
    """
    Generate AI response using the specified model.
    Supports: gemini, claude, gpt4
    """
    # Skip generic formatting instructions for modes that have strict formatting rules
    if mode == "prompt-enhancer":
        suffix = ""
    else:
        suffix = "\n\n[FINAL REMINDER] Use emojis naturally throughout to make the response lively and easy to scan. Add blank lines between sections for breathing room. Use clean markdown: bold key points, emoji-prefixed bullets, headers with emojis. Be focused and concise. Do NOT include any profile data, keyword lists, or profile sections in your response."

    full_prompt = f"""{system_prompt}

CONVERSATION HISTORY:
{history_text}

USER REQUEST: {user_message}{suffix}"""

    try:
        if model == "gemini":
            client = get_gemini_client()
            if not client:
                raise Exception("Gemini API not configured - add GEMINI_API_KEY to .env")

            # Try with retry on rate limit
            max_retries = 3
            response = None
            for attempt in range(max_retries):
                try:
                    from google.genai import types as _gtypes
                    response = client.models.generate_content(
                        model="gemini-2.0-flash",
                        contents=full_prompt,
                        config=_gtypes.GenerateContentConfig(temperature=1.5)
                    )
                    break
                except Exception as e:
                    error_str = str(e)
                    if ("429" in error_str or "RESOURCE_EXHAUSTED" in error_str) and attempt < max_retries - 1:
                        import asyncio
                        await asyncio.sleep((attempt + 1) * 5)
                        continue
                    raise
            return response.text.strip() if response.text else "I couldn't generate a response."

        elif model == "claude":
            client = get_anthropic_client()
            if not client:
                raise Exception("Claude API not configured - add valid ANTHROPIC_API_KEY to .env")

            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4096,
                temperature=1.0,
                messages=[
                    {"role": "user", "content": full_prompt}
                ]
            )
            return response.content[0].text.strip() if response.content else "I couldn't generate a response."

        elif model == "gpt4":
            client = get_openai_client()
            if not client:
                raise Exception("OpenAI API not configured - add valid OPENAI_API_KEY to .env")

            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"CONVERSATION HISTORY:\n{history_text}\n\nUSER REQUEST: {user_message}"}
                ],
                max_tokens=4096,
                temperature=1.5
            )
            return response.choices[0].message.content.strip() if response.choices else "I couldn't generate a response."

        elif model == "nano-bana":
            # Image generation using Gemini 2.5 Flash Image
            client = get_gemini_client()
            if not client:
                raise Exception("Gemini API not configured - add GEMINI_API_KEY to .env")

            try:
                from google.genai import types
                from pathlib import Path
                import uuid as _uuid

                # Extract creator profile from system_prompt for image context
                profile_summary = ""
                if "CREATOR PROFILE" in system_prompt or "PROJECT NAME:" in system_prompt:
                    profile_lines = []
                    for line in system_prompt.split('\n'):
                        s = line.strip()
                        # Match actual field labels from project_context
                        if s.startswith((
                            'PROJECT NAME:', 'NICHE:', 'SUB-NICHE:',
                            'CONTENT FORMATS:', 'PLATFORMS:', 'TONE & STYLE:',
                            'KEYWORDS (', 'ANTI-KEYWORDS (', 'REFERENCE ACCOUNTS:',
                        )):
                            profile_lines.append(s)
                    if profile_lines:
                        profile_summary = '\n'.join(profile_lines)

                print(f"[AI] Nano Bana: profile_found={bool(profile_summary)}, user_msg='{user_message[:100]}'")

                # Build image prompt with creator context baked in
                if profile_summary:
                    image_prompt = f"""Generate an image for a content creator with this brand:
{profile_summary}

Request: {user_message}

Create a vibrant, professional, aesthetic image matching this creator's niche and style."""
                else:
                    image_prompt = f"""Generate an image: {user_message}

Create a vibrant, professional, high-quality image."""

                print(f"[AI] Nano Bana final prompt ({len(image_prompt)} chars): {image_prompt[:300]}")

                uploads_dir = Path(__file__).parent.parent.parent / "uploads" / "generated"
                uploads_dir.mkdir(parents=True, exist_ok=True)

                # Attempt 1: Image-only modality (forces Gemini to generate image, not text)
                for attempt in range(2):
                    try:
                        if attempt == 0:
                            # Force image-only output
                            response = client.models.generate_content(
                                model="gemini-2.5-flash-image",
                                contents=image_prompt,
                                config=types.GenerateContentConfig(
                                    response_modalities=["Image"]
                                )
                            )
                        else:
                            # Fallback: allow text+image
                            response = client.models.generate_content(
                                model="gemini-2.5-flash-image",
                                contents=f"Generate an image: {user_message}",
                                config=types.GenerateContentConfig(
                                    response_modalities=["Image", "Text"]
                                )
                            )
                    except Exception as api_err:
                        error_str = str(api_err)
                        print(f"[AI] Nano Bana API error attempt {attempt+1}: {error_str}")
                        # If Image-only modality not supported, try with Text+Image
                        if attempt == 0:
                            import asyncio
                            await asyncio.sleep(2)
                            continue
                        raise

                    # Parse response for images
                    result_parts = []
                    has_image = False

                    if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
                        for part in response.candidates[0].content.parts:
                            if hasattr(part, 'inline_data') and part.inline_data and part.inline_data.data:
                                ext = "png" if "png" in (part.inline_data.mime_type or "") else "jpg"
                                filename = f"{_uuid.uuid4().hex}.{ext}"
                                filepath = uploads_dir / filename
                                filepath.write_bytes(part.inline_data.data)
                                img_url = f"/uploads/generated/{filename}"
                                result_parts.append(f"![Generated Image]({img_url})")
                                has_image = True
                                print(f"[AI] Nano Bana image saved: {filepath} ({len(part.inline_data.data)} bytes)")
                            elif hasattr(part, 'text') and part.text:
                                result_parts.append(part.text.strip())

                    if has_image:
                        return "\n\n".join(result_parts)

                    print(f"[AI] Nano Bana attempt {attempt+1}: no image in response, text={result_parts[:1]}")

                # Both attempts failed to produce image
                if result_parts:
                    return "\n\n".join(result_parts)
                return "Could not generate an image. Please try a more descriptive prompt."

            except Exception as img_err:
                print(f"[AI] Nano Bana error: {img_err}")
                return f"Image generation error: {str(img_err)[:200]}. Please try again."

        else:
            # Default to Gemini
            return await generate_ai_response("gemini", system_prompt, user_message, history_text)

    except Exception as e:
        error_str = str(e).lower()
        print(f"[AI] Error with {model}: {e}")

        # User-friendly error messages
        if "credit balance is too low" in error_str or "insufficient_quota" in error_str:
            model_name = {"gemini": "Gemini", "claude": "Claude (Anthropic)", "gpt4": "GPT-4 (OpenAI)"}.get(model, model)
            raise Exception(f"{model_name}: insufficient API credits. Top up your provider account.")
        elif "invalid x-api-key" in error_str or "invalid api key" in error_str or "authentication_error" in error_str:
            raise Exception(f"Invalid API key for {model}. Check your .env settings.")
        elif "rate_limit" in error_str or "429" in error_str:
            raise Exception(f"Rate limit exceeded for {model}. Try again in a minute.")
        else:
            raise e


# =============================================================================
# SCHEMAS
# =============================================================================

class ChatSessionCreate(BaseModel):
    """Create a new chat session."""
    title: Optional[str] = "New Chat"
    model: str = "gemini"
    mode: str = "script"
    context_type: Optional[str] = None
    context_id: Optional[int] = None
    context_data: Optional[dict] = {}


class ChatSessionUpdate(BaseModel):
    """Update chat session."""
    title: Optional[str] = None
    is_pinned: Optional[bool] = None


class ChatSessionResponse(BaseModel):
    """Chat session response."""
    id: int
    session_id: str
    title: str
    model: str
    mode: str
    message_count: int
    is_pinned: bool = False
    context_type: Optional[str] = None
    context_data: Optional[dict] = None
    created_at: datetime
    updated_at: datetime
    last_message: Optional[str] = None

    class Config:
        from_attributes = True


class ChatMessageCreate(BaseModel):
    """Send a message in a chat session."""
    message: str = Field(..., min_length=1, max_length=10000)
    mode: Optional[str] = None
    model: Optional[str] = None
    language: Optional[str] = "English"
    project_id: Optional[int] = None
    context: Optional[str] = None  # Per-message context (from attachments/links)


class ParseLinkRequest(BaseModel):
    """Parse a video URL to extract metadata."""
    url: str = Field(..., min_length=5, max_length=2000)


class ParseLinkResponse(BaseModel):
    """Parsed video metadata."""
    platform: str
    description: str
    author: str
    stats: dict
    hashtags: list
    music: Optional[str] = None


class ChatMessageResponse(BaseModel):
    """Chat message response."""
    id: int
    role: str
    content: str
    model: Optional[str] = None
    mode: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CreditsInfo(BaseModel):
    """Credit balance information."""
    remaining: int
    cost: int
    monthly_limit: int
    tier: str


class ChatResponse(BaseModel):
    """AI response after sending a message."""
    user_message: ChatMessageResponse
    ai_response: ChatMessageResponse
    session: ChatSessionResponse
    credits: Optional[CreditsInfo] = None


# =============================================================================
# MODE PROMPTS
# =============================================================================

MODE_PROMPTS = {
    "script": """You are an expert viral TikTok script writer. Create engaging, hook-driven scripts that capture attention in the first 3 seconds.

Format your response with emojis and clear sections:

🎣 **Hook** (first 3 seconds)
📖 **Body** (main content)
📣 **Call to Action**
💡 **Pro Tips**

Use emojis on bullet points. Add blank lines between sections. Be punchy, no fluff.""",

    "ideas": """You are a creative TikTok content strategist. Generate unique, trending video ideas with viral potential.

For each idea use this format with emojis:

💡 **Idea title**
🎬 Concept: ...
🔥 Why it could go viral: ...
⏰ Best posting time: ...
#️⃣ Hashtags: ...

Add blank lines between ideas. Be specific and energetic.""",

    "analysis": """You are a TikTok analytics expert. Analyze the video or topic the user asks about directly.

Structure your response with emojis and blank lines between sections:

📊 **Performance** — stats and reach
🎯 **Why it works** — hooks, pacing, editing, format
🔥 **Viral mechanics** — what makes it spread
✅ **Key takeaways** — actionable observations

STRICT RULES:
- Analyze ONLY the video/content itself
- NEVER mention the creator's profile, keywords, anti-keywords, or any profile data
- Do NOT say "based on your niche", "given your keywords", "for your audience"
- Deliver clean, direct analysis with emojis and breathing room between sections""",

    "improve": """You are a content optimization specialist. Take existing scripts/content and make them more engaging and viral.

Structure your response with emojis:

🔍 **What's weak** — honest critique
✨ **Improved version** — rewritten content
💡 **Why these changes work**

Add blank lines between sections. Be direct and actionable.""",

    "hook": """You are a hook specialist. Create attention-grabbing opening lines that stop the scroll.

Provide 5 hook variations, each formatted as:

🎣 **Hook #N:** "..."
🧠 *Why it works:* ...

Add blank lines between hooks. Keep it punchy.""",

    "chat": """You are a friendly and helpful AI assistant. Have a natural conversation with the user.

Use emojis naturally to keep the tone warm and engaging. Add blank lines between paragraphs for readability. Answer directly and concisely. Do not format responses as scripts or strategies unless the user asks.""",

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

@router.get("/credits")
async def get_credits_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's credit balance and plan info.
    Also triggers monthly credit reset if needed.
    """
    # Check and reset monthly credits if needed
    CreditManager.check_and_reset_monthly(current_user, db)

    return CreditManager.get_credits_info(current_user)


@router.get("/", response_model=List[ChatSessionResponse])
async def get_chat_sessions(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all chat sessions for the current user.
    Returns sessions sorted by most recently updated.
    """
    sessions = db.query(ChatSession).filter(
        ChatSession.user_id == current_user.id
    ).order_by(desc(ChatSession.updated_at)).offset(skip).limit(limit).all()

    result = []
    for session in sessions:
        # Get last message preview
        last_msg = db.query(ChatMessage).filter(
            ChatMessage.session_id == session.session_id
        ).order_by(desc(ChatMessage.created_at)).first()

        session_dict = {
            "id": session.id,
            "session_id": session.session_id,
            "title": session.title,
            "model": session.model,
            "mode": session.mode,
            "message_count": session.message_count,
            "is_pinned": getattr(session, 'is_pinned', False),
            "context_type": session.context_type,
            "context_data": session.context_data,
            "created_at": session.created_at,
            "updated_at": session.updated_at,
            "last_message": last_msg.content[:100] + "..." if last_msg and len(last_msg.content) > 100 else (last_msg.content if last_msg else None)
        }
        result.append(ChatSessionResponse(**session_dict))

    return result


@router.post("/", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_chat_session(
    data: ChatSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new chat session.
    """
    session = ChatSession(
        user_id=current_user.id,
        session_id=str(uuid.uuid4()),
        title=data.title or "New Chat",
        model=data.model,
        mode=data.mode,
        context_type=data.context_type,
        context_id=data.context_id,
        context_data=data.context_data or {}
    )

    db.add(session)
    db.commit()
    db.refresh(session)

    return ChatSessionResponse(
        id=session.id,
        session_id=session.session_id,
        title=session.title,
        model=session.model,
        mode=session.mode,
        message_count=session.message_count,
        is_pinned=session.is_pinned,
        context_type=session.context_type,
        context_data=session.context_data,
        created_at=session.created_at,
        updated_at=session.updated_at,
        last_message=None
    )


@router.get("/{session_id}", response_model=ChatSessionResponse)
async def get_chat_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific chat session by ID.
    """
    session = db.query(ChatSession).filter(
        ChatSession.session_id == session_id,
        ChatSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )

    # Get last message
    last_msg = db.query(ChatMessage).filter(
        ChatMessage.session_id == session.session_id
    ).order_by(desc(ChatMessage.created_at)).first()

    return ChatSessionResponse(
        id=session.id,
        session_id=session.session_id,
        title=session.title,
        model=session.model,
        mode=session.mode,
        message_count=session.message_count,
        is_pinned=getattr(session, 'is_pinned', False),
        context_type=session.context_type,
        context_data=session.context_data,
        created_at=session.created_at,
        updated_at=session.updated_at,
        last_message=last_msg.content[:100] if last_msg else None
    )


@router.patch("/{session_id}", response_model=ChatSessionResponse)
async def update_chat_session(
    session_id: str,
    data: ChatSessionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a chat session (e.g., rename).
    """
    session = db.query(ChatSession).filter(
        ChatSession.session_id == session_id,
        ChatSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )

    if data.title is not None:
        session.title = data.title
    if data.is_pinned is not None:
        session.is_pinned = data.is_pinned

    session.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(session)

    return ChatSessionResponse(
        id=session.id,
        session_id=session.session_id,
        title=session.title,
        model=session.model,
        mode=session.mode,
        message_count=session.message_count,
        is_pinned=session.is_pinned,
        context_type=session.context_type,
        context_data=session.context_data,
        created_at=session.created_at,
        updated_at=session.updated_at,
        last_message=None
    )


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a chat session and all its messages.
    """
    session = db.query(ChatSession).filter(
        ChatSession.session_id == session_id,
        ChatSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )

    # Delete associated messages
    db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id,
        ChatMessage.user_id == current_user.id
    ).delete()

    db.delete(session)
    db.commit()


@router.get("/{session_id}/messages", response_model=List[ChatMessageResponse])
async def get_session_messages(
    session_id: str,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all messages in a chat session.
    """
    # Verify session belongs to user
    session = db.query(ChatSession).filter(
        ChatSession.session_id == session_id,
        ChatSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )

    messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at).offset(skip).limit(limit).all()

    return [ChatMessageResponse.model_validate(msg) for msg in messages]


@router.post("/{session_id}/messages", response_model=ChatResponse)
async def send_message(
    session_id: str,
    data: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a message in a chat session and get AI response.
    """
    # Verify session belongs to user
    session = db.query(ChatSession).filter(
        ChatSession.session_id == session_id,
        ChatSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found"
        )

    # Use model from request if provided, otherwise use session's model
    current_model = data.model or session.model
    print(f"[AI] Request model={data.model}, session model={session.model}, using={current_model}")

    # Update session model if changed
    if data.model and data.model != session.model:
        session.model = data.model
        print(f"[AI] Session model updated to: {data.model}")

    # --- CREDIT SYSTEM ---
    # 1. Check and reset monthly credits if needed
    CreditManager.check_and_reset_monthly(current_user, db)

    # 2. Check if user has enough credits for this model
    credit_cost = await CreditManager.check_credits_for_chat(current_model, current_user, db)
    print(f"[Credits] User {current_user.id}: balance={current_user.credits}, cost={credit_cost} for model={current_model}")

    # Get conversation history (last 10 messages for context)
    history = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(desc(ChatMessage.created_at)).limit(10).all()

    history = list(reversed(history))  # Oldest first

    # Save user message
    user_msg = ChatMessage(
        user_id=current_user.id,
        session_id=session_id,
        role="user",
        content=data.message,
        model=current_model,
        mode=data.mode or session.mode
    )
    db.add(user_msg)

    # Build history text for AI
    # Strip profile dumps from old assistant messages so AI doesn't reproduce the pattern
    PROFILE_MARKERS = [
        "CREATOR PROFILE", "===== ПРОФИЛЬ", "ПРОФИЛЬ КАНАЛА", "ПРОФИЛЬ СОЗДАТЕЛЯ",
        "КЛЮЧЕВЫЕ СЛОВА:", "KEYWORDS:", "ANTI-KEYWORDS", "АНТИ-КЛЮЧЕВЫЕ",
        "НАЗВАНИЕ ПРОЕКТА:", "PROJECT NAME:", "===== END PROFILE"
    ]
    history_text = ""
    for msg in history:
        role = "User" if msg.role == "user" else "Assistant"
        content = msg.content
        if msg.role == "assistant":
            # If assistant message contains profile dump, truncate before it
            lower = content.lower()
            for marker in PROFILE_MARKERS:
                idx = lower.find(marker.lower())
                if idx > 0:
                    content = content[:idx].strip()
                    break
        history_text += f"{role}: {content}\n"

    # Add context if available (session-level + per-message)
    context_text = ""
    if session.context_data:
        context_text = f"\nCONTEXT: {session.context_data}\n"
    if data.context:
        context_text += f"\nATTACHED CONTENT:\n{data.context}\n"

    # Get mode-specific system prompt
    mode = data.mode or session.mode
    print(f"[AI] Request mode={data.mode}, session mode={session.mode}, using={mode}")

    # Update session mode if changed
    if data.mode and data.mode != session.mode:
        session.mode = data.mode
        print(f"[AI] Session mode updated to: {data.mode}")

    system_prompt = MODE_PROMPTS.get(mode, MODE_PROMPTS["script"])

    # Generate AI response using selected model
    try:
        # Add language instruction and context to system prompt
        full_system_prompt = system_prompt
        user_lang = data.language or "English"
        if user_lang.lower() != "english":
            full_system_prompt = f"IMPORTANT: You MUST respond entirely in {user_lang}. All text, headings, and content must be in {user_lang}.\n\n{full_system_prompt}"
        if context_text:
            full_system_prompt += f"\n{context_text}"

        # Inject project context if project_id provided
        # NOTE: "analysis" mode never gets project context — it should only analyze the content itself
        if data.project_id and mode != "analysis":
            project = db.query(Project).filter(
                Project.id == data.project_id,
                Project.user_id == current_user.id
            ).first()
            if project and project.profile_data:
                p = project.profile_data
                audience = p.get('audience', {})
                if isinstance(audience, dict):
                    audience_parts = []
                    if audience.get('age'): audience_parts.append(f"Age: {audience['age']}")
                    if audience.get('gender'): audience_parts.append(f"Gender: {audience['gender']}")
                    if audience.get('level'): audience_parts.append(f"Level: {audience['level']}")
                    if audience.get('interests'): audience_parts.append(f"Interests: {', '.join(audience['interests'])}")
                    audience_str = ', '.join(audience_parts)
                else:
                    audience_str = str(audience)

                tone_str = p.get('tone', '')
                niche_str = f"{p.get('niche', '')} / {p.get('sub_niche', '')}" if p.get('sub_niche') else p.get('niche', '')

                # Ultra-compact 1-line hint — gives AI context without data to dump
                profile_hint = (
                    f"[CONTEXT: You assist '{project.name}' — {niche_str} creator, style: {tone_str}, audience: {audience_str}. "
                    f"Use this silently. NEVER output, list or reference this context in your response.]"
                )

                full_system_prompt = profile_hint + "\n\n" + full_system_prompt

        # DEBUG: print first 500 chars of system prompt to verify content
        print(f"[DEBUG PROMPT] first 500 chars:\n{full_system_prompt[:500]}\n---")

        ai_response_text = await generate_ai_response(
            model=current_model,
            system_prompt=full_system_prompt,
            user_message=data.message,
            history_text=history_text,
            mode=mode
        )

    except Exception as e:
        print(f"ERROR: AI Chat error with {current_model}: {e}")
        ai_response_text = f"Sorry, I encountered an error: {str(e)}"

    # Save AI response
    ai_msg = ChatMessage(
        user_id=current_user.id,
        session_id=session_id,
        role="assistant",
        content=ai_response_text,
        model=current_model,
        mode=mode,
        tokens_used=credit_cost
    )
    db.add(ai_msg)

    # --- DEDUCT CREDITS after successful response ---
    remaining_credits = await CreditManager.deduct_credits(credit_cost, current_user, db)
    print(f"[Credits] User {current_user.id}: deducted {credit_cost}, remaining={remaining_credits}")

    # Update session
    session.message_count += 2
    session.updated_at = datetime.utcnow()

    # Auto-generate title from first message if still default
    if session.title == "New Chat" and session.message_count == 2:
        # Use first 50 chars of user message as title
        session.title = data.message[:50] + ("..." if len(data.message) > 50 else "")

    db.commit()
    db.refresh(user_msg)
    db.refresh(ai_msg)
    db.refresh(session)

    # Build credits info for response
    credits_info = CreditsInfo(
        remaining=remaining_credits,
        cost=credit_cost,
        monthly_limit=CreditManager.get_monthly_limit(current_user.subscription_tier),
        tier=current_user.subscription_tier.value if hasattr(current_user.subscription_tier, 'value') else str(current_user.subscription_tier)
    )

    return ChatResponse(
        user_message=ChatMessageResponse.model_validate(user_msg),
        ai_response=ChatMessageResponse.model_validate(ai_msg),
        session=ChatSessionResponse(
            id=session.id,
            session_id=session.session_id,
            title=session.title,
            model=session.model,
            mode=session.mode,
            message_count=session.message_count,
            is_pinned=getattr(session, 'is_pinned', False),
            context_type=session.context_type,
            context_data=session.context_data,
            created_at=session.created_at,
            updated_at=session.updated_at,
            last_message=ai_response_text[:100]
        ),
        credits=credits_info
    )


# =============================================================================
# PARSE LINK - Extract video metadata from URL
# =============================================================================

@router.post("/parse-link", response_model=ParseLinkResponse)
async def parse_link(
    data: ParseLinkRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Parse a TikTok/Instagram video URL and extract metadata.
    Returns structured data for AI chat context injection.
    Cost: 1 credit.
    """
    # Check credits (1 credit for parse-link)
    CreditManager.check_and_reset_monthly(current_user, db)
    total_credits = (current_user.credits or 0) + (current_user.rollover_credits or 0) + (current_user.bonus_credits or 0)
    if total_credits < 1:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={"message": "Insufficient credits for link parsing", "required": 1, "available": total_credits}
        )

    url = data.url.strip()

    # Extract metadata via yt-dlp (supports TikTok short URLs, Instagram, YouTube)
    try:
        import yt_dlp
        import asyncio

        def _extract_info(video_url: str) -> dict:
            ydl_opts = {
                'skip_download': True,
                'quiet': True,
                'no_warnings': True,
                'extract_flat': False,
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                return ydl.extract_info(video_url, download=False) or {}

        info = await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(None, _extract_info, url),
            timeout=20
        )

        if not info:
            raise HTTPException(status_code=404, detail="Could not fetch video data")

        # Detect platform from resolved URL
        webpage_url = info.get('webpage_url', url)
        platform = "unknown"
        if "tiktok.com" in webpage_url:
            platform = "tiktok"
        elif "instagram.com" in webpage_url:
            platform = "instagram"
        elif "youtube.com" in webpage_url or "youtu.be" in webpage_url:
            platform = "youtube"

        description = info.get('description') or info.get('title') or ''
        author = info.get('uploader') or info.get('channel') or info.get('creator') or ''
        stats = {
            "views":    info.get('view_count') or 0,
            "likes":    info.get('like_count') or 0,
            "comments": info.get('comment_count') or 0,
            "shares":   info.get('repost_count') or 0,
        }
        hashtags = [t for t in (info.get('tags') or []) if t]
        music = info.get('track') or info.get('artist') or None

        # Deduct 1 credit
        await CreditManager.deduct_credits(1, current_user, db)

        return ParseLinkResponse(
            platform=platform,
            description=description,
            author=author,
            stats=stats,
            hashtags=hashtags,
            music=music
        )

    except HTTPException:
        raise
    except asyncio.TimeoutError:
        raise HTTPException(status_code=408, detail="Timeout fetching video data")
    except Exception as e:
        print(f"[ParseLink] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to parse link: {str(e)}")
