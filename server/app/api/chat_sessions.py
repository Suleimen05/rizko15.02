# backend/app/api/chat_sessions.py
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
from ..db.models import User, ChatSession, ChatMessage
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


async def generate_ai_response(model: str, system_prompt: str, user_message: str, history_text: str = "") -> str:
    """
    Generate AI response using the specified model.
    Supports: gemini, claude, gpt4
    """
    full_prompt = f"""{system_prompt}

CONVERSATION HISTORY:
{history_text}

USER REQUEST: {user_message}

Respond in a helpful, structured way. Use markdown formatting (bold, bullets, headers) for readability.
Keep the response focused, concise, and actionable. Avoid overly long responses — be brief but informative.
Language: respond in the same language as the user's message."""

    try:
        if model == "gemini":
            client = get_gemini_client()
            if not client:
                raise Exception("Gemini API not configured - add GEMINI_API_KEY to .env")

            # Try newer model first, fallback to older
            try:
                response = client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=full_prompt
                )
            except Exception:
                # Fallback to gemini-1.5-flash-latest
                response = client.models.generate_content(
                    model="gemini-1.5-flash-latest",
                    contents=full_prompt
                )
            return response.text.strip() if response.text else "I couldn't generate a response."

        elif model == "claude":
            client = get_anthropic_client()
            if not client:
                raise Exception("Claude API not configured - add valid ANTHROPIC_API_KEY to .env")

            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4096,
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
                max_tokens=4096
            )
            return response.choices[0].message.content.strip() if response.choices else "I couldn't generate a response."

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


class ChatSessionResponse(BaseModel):
    """Chat session response."""
    id: int
    session_id: str
    title: str
    model: str
    mode: str
    message_count: int
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
Format your response with:
1. **Hook** (first 3 seconds)
2. **Body** (main content, bullet points)
3. **Call to Action**
4. **Pro Tips** for maximum engagement

Keep responses concise and actionable. No fluff.""",

    "ideas": """You are a creative TikTok content strategist. Generate unique, trending video ideas with viral potential.
For each idea include:
- Video concept
- Why it could go viral
- Best posting time
- Suggested hashtags

Be brief and specific.""",

    "analysis": """You are a TikTok analytics expert. Analyze trends, content strategies, and viral mechanics.
Provide concise insights on:
- What makes content successful
- Audience behavior patterns
- Growth opportunities
- Competitor strategies""",

    "improve": """You are a content optimization specialist. Take existing scripts/content and make them more engaging and viral.
Focus on:
- Stronger hooks
- Better pacing
- More emotional triggers
- Clearer call-to-action

Be concise.""",

    "hook": """You are a hook specialist. Create attention-grabbing opening lines that stop the scroll.
Provide:
- 5 different hook variations
- Why each works psychologically
- Best delivery tips

Keep it short and punchy."""
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

    if data.title:
        session.title = data.title

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
    history_text = ""
    for msg in history:
        role = "User" if msg.role == "user" else "Assistant"
        history_text += f"{role}: {msg.content}\n"

    # Add context if available
    context_text = ""
    if session.context_data:
        context_text = f"\nCONTEXT: {session.context_data}\n"

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
        # Add context to system prompt if available
        full_system_prompt = system_prompt
        if context_text:
            full_system_prompt += f"\n{context_text}"

        ai_response_text = await generate_ai_response(
            model=current_model,
            system_prompt=full_system_prompt,
            user_message=data.message,
            history_text=history_text
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
            context_type=session.context_type,
            context_data=session.context_data,
            created_at=session.created_at,
            updated_at=session.updated_at,
            last_message=ai_response_text[:100]
        ),
        credits=credits_info
    )
