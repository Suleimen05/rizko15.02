"""
Pydantic schemas for AI Chat History.

Manages conversation history and session management.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator
import re
import uuid


# =============================================================================
# CHAT MESSAGE SCHEMAS
# =============================================================================

class ChatMessageCreate(BaseModel):
    """Schema for creating a chat message."""
    session_id: str = Field(
        default_factory=lambda: str(uuid.uuid4())[:8],
        max_length=100,
        description="Conversation session ID"
    )
    role: str = Field(
        ...,
        description="Message role: user or assistant"
    )
    content: str = Field(
        ...,
        min_length=1,
        max_length=10000,
        description="Message content"
    )
    model: Optional[str] = Field(
        None,
        max_length=50,
        description="AI model used (for assistant messages)"
    )
    mode: Optional[str] = Field(
        None,
        max_length=50,
        description="Chat mode: script, ideas, analysis, improve, hook"
    )
    tokens_used: Optional[int] = Field(
        None,
        ge=0,
        description="Tokens consumed"
    )

    @field_validator('role')
    @classmethod
    def validate_role(cls, v: str) -> str:
        """Validate role is user or assistant."""
        if v.lower() not in ['user', 'assistant']:
            raise ValueError('Role must be "user" or "assistant"')
        return v.lower()

    @field_validator('content')
    @classmethod
    def sanitize_content(cls, v: str) -> str:
        """Sanitize message content."""
        sanitized = re.sub(r'[<>]', '', v)
        return sanitized.strip()


class ChatMessageResponse(BaseModel):
    """Response schema for a chat message."""
    id: int
    user_id: int
    session_id: str
    role: str
    content: str
    model: Optional[str] = None
    mode: Optional[str] = None
    tokens_used: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# =============================================================================
# SESSION SCHEMAS
# =============================================================================

class ChatSessionSummary(BaseModel):
    """Summary of a chat session."""
    session_id: str
    message_count: int
    first_message_at: datetime
    last_message_at: datetime
    mode: Optional[str] = None
    preview: str = Field(..., description="First 100 chars of first user message")


class ChatSessionResponse(BaseModel):
    """Full chat session with messages."""
    session_id: str
    messages: List[ChatMessageResponse]
    total_messages: int
    total_tokens: int = 0
    mode: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ChatSessionListResponse(BaseModel):
    """List of chat sessions."""
    items: List[ChatSessionSummary]
    total: int
    page: int = 1
    per_page: int = 20
    has_more: bool = False


# =============================================================================
# HISTORY RETRIEVAL
# =============================================================================

class ChatHistoryRequest(BaseModel):
    """Request for chat history retrieval."""
    session_id: Optional[str] = Field(
        None,
        max_length=100,
        description="Specific session ID to retrieve"
    )
    limit: int = Field(
        default=50,
        ge=1,
        le=200,
        description="Number of messages to retrieve"
    )
    before_id: Optional[int] = Field(
        None,
        description="Get messages before this ID (for pagination)"
    )
    mode: Optional[str] = Field(
        None,
        max_length=50,
        description="Filter by chat mode"
    )


class ChatHistoryResponse(BaseModel):
    """Response with chat history."""
    messages: List[ChatMessageResponse]
    total: int
    has_more: bool = False
    oldest_id: Optional[int] = None
    newest_id: Optional[int] = None


# =============================================================================
# SESSION MANAGEMENT
# =============================================================================

class SessionCreate(BaseModel):
    """Create a new chat session."""
    mode: str = Field(
        default="script",
        max_length=50,
        description="Chat mode for this session"
    )
    title: Optional[str] = Field(
        None,
        max_length=200,
        description="Optional session title"
    )


class SessionDelete(BaseModel):
    """Delete chat session(s)."""
    session_ids: List[str] = Field(
        ...,
        min_items=1,
        max_items=50,
        description="Session IDs to delete"
    )


class SessionDeleteResult(BaseModel):
    """Result of session deletion."""
    deleted_count: int
    deleted_messages: int
